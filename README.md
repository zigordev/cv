# cv

Personal CV web app — a single-page editorial CV with per-project case-study
modals, EN/ES chrome, print-to-PDF, and a contact form that publishes to the
shared notifications service.

Built from the "CV Editorial" design handoff on the
[shared product design system](https://github.com/zigordev/design-system).

## Shape

One workspace, `apps/ui`: a Next.js 15 App Router app built with
`output: 'standalone'` and run as a container on the shared `platform_ops_shared`
network, like every other app on the platform.

There is deliberately **no `apps/api` and no database**. The only server-side
work is the Tolgee pull at boot and a single contact-form route handler, so a
NestJS service alongside would be one endpoint's worth of ceremony. Delivery
state, idempotency and dead-letter auditing all live in the notifications
service already.

| Concern       | Where                                                               |
| ------------- | ------------------------------------------------------------------- |
| UI            | `apps/ui/src/components` — sections composed from the design system |
| CV content    | Tolgee → `cv.*`; skeleton in `apps/ui/src/content/cv.ts`            |
| UI copy       | Tolgee → `apps/ui/messages/{en,es}.json`                            |
| Secrets       | OpenBao, kv mount, path `cv`                                        |
| Contact email | `POST /api/contact` → Kafka `notification.email.requested.v1`       |
| Design system | `apps/ui/design-system` (vendored copy)                             |

## Local development

The app needs the `platform-ops` stack (OpenBao, Tolgee, Redpanda) running
first — see that repo's `docs/local-first-start.md`.

```bash
npm ci
cp docker/.env.app.local.example docker/.env.app.local
```

Fill in `OPENBAO_TOKEN` and `TOLGEE_PROJECT_ID`, then:

```bash
npm run local:up
```

That verifies OpenBao is unsealed and holds the required keys, pulls the Tolgee
snapshots into `messages/`, and brings the container up on
<http://localhost:3021>.

`OPENBAO_TOKEN` is not the OpenBao root token — it is a scoped token minted
against a `cv-local-read` policy that grants nothing beyond `kv/cv`.
[docs/local-first-start.md](docs/local-first-start.md) walks through creating
the policy and the token, and is the runbook to follow the first time.

For a plain dev server without containers or secrets (the CV renders fine; only
the contact form needs Kafka):

```bash
npm run dev -w @cv/web
```

## Required OpenBao keys

At `kv/cv`:

| Key                       | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `TOLGEE_API_KEY`          | Pulling translation snapshots             |
| `CONTACT_RECIPIENT_EMAIL` | Where contact-form messages are delivered |

`CONTACT_RECIPIENT_EMAIL` is not secret in the cryptographic sense; it lives in
OpenBao so a personal inbox address is not committed to a public repository.

## Layout

A single scrolling page: sticky index rail on the left, sections on the right,
set in a display serif. Two alternative layouts (a card grid and a monospace
terminal) were built to compare against it and removed once this one won —
`git log` has them if the comparison is ever worth repeating.

## PDF

`Download PDF` is a plain download link to `public/cv-{locale}.pdf`, generated
at build time by `apps/ui/scripts/generate-pdf.mjs`. It used to call
`window.print()`, which opens a dialog rather than downloading anything.

Headless Chromium renders the same `@media print` document a browser would, so
the output keeps real selectable text — the point of the whole ATS-friendly
layout, and exactly what the popular client-side html-to-PDF libraries destroy
by rasterising the page. Chromium is a **build-stage dependency only**; the
runtime image is unchanged.

Without a Chromium the step warns and skips, so `npm run build` still works on
a laptop or in CI. The Docker build sets `CV_PDF_REQUIRED=1`, which turns that
into a hard failure, so a released image can never ship a download button
pointing at a missing file.

`PrintResume` is a separate single-column document that replaces the page under
`@media print`; see the comment at the top of that component for what it
optimises for.

**The PDF carries no contact details** — no email, no phone, no profile links,
and the schema.org Person in the document head has none either. The contact
form is the only route in, reaching the same inbox via
`CONTACT_RECIPIENT_EMAIL` in OpenBao, so no address appears in anything served.
That is a deliberate trade: an ATS keys on the email address, so a record
parsed from this PDF has no contact field, and a reader who keeps the file has
to return to the site. Restoring a detail means putting it back in the PDF
header, the JSON-LD and `content/cv.ts` — not just one of them. It follows the selected language, headings included — parsers
match on the literal heading word, so a Spanish CV needs EXPERIENCIA rather
than EXPERIENCE.

## Case study modal

Two tabs: Overview (problem and approach) and Architecture (the pieces, plus a
diagram where one exists). The repo link sits under the tagline in the header
rather than inside a tab, so it is reachable from either one.

There was a third tab, Results, holding stats and lessons. Both were empty
arrays for every project — it rendered as a tab you clicked to find a single
link — so the tab, the `lessons` and `stats` fields and the `ProjectStat` type
are gone. `modal.results` and `modal.lessons` are now unused keys in Tolgee.

## Diagrams

Every project has an architecture diagram in its case study, under the
Architecture tab beside the pieces that explain it. They are inline SVG rather
than exported images so they follow the theme tokens, stay selectable text, and
cannot go stale against a screenshot.

Each one makes a single point rather than inventorying the system: gpool's is
the request path and the email that deliberately leaves it, trading-bot's is the
one strategy crate feeding both live and backtest, notifications' is the
dead-letter branch. `primitives.tsx` holds the frame, box, arrow and text
treatments; each diagram is then only geometry and content.

Notes render inside fixed-width boxes, so they have a hard length budget —
roughly 26 characters at 160px and 32 at 200px, **in both languages**. Spanish
runs longer; check it when editing.

The split follows the same rule as the rest of the content: service and
application names are proper nouns and live in the component next to the
geometry, while every word of prose comes from `cv.diagrams.*`. A translator
handed `openbao` in a string table would eventually translate it.

`components/diagrams/index.ts` maps project id to component, so a project
without one simply renders no figure. The registry lives there rather
than as a field on the project because a diagram is code, and `content/cv.ts`
should not import the component tree it is meant to be independent of.

Case-study pieces are not in the PDF — that reads `tagline` and `decisions`
only, so a long architecture explanation cannot bloat the ATS document.

## Contact form

`POST /api/contact` validates the submission, rate-limits per IP, and publishes
a `notification.email.requested.v1` event with `templateId: 'cv.contact-received'`.

The event's `recipient` is always `CONTACT_RECIPIENT_EMAIL` and the visitor's
address goes in `replyTo`. That is what keeps a public form from being an open
relay: a sender controls the body, never the destination.

The matching templates live in the notifications repo at
`apps/api/src/resources/templates/email/cv/` (EN, plus `es/`), and are
registered in `template-catalog.service.ts`.

Rate limiting is a process-local map — fine for a single container, but not a
defence against a distributed flood. If that ever matters, move it to the
shared Redis or put a WAF rule in front.

## i18n

Everything a reader reads lives in Tolgee, as in gpool — including the CV
itself, under a `cv.*` namespace: headline, roles, case studies, section names
and the PDF's headings.

`content/cv.ts` holds only what reads identically in every language and is not
translatable copy: ids, ordering, years, technology names and URLs. Keeping
`Next.js` and GitHub links out of the translation store avoids duplicating them
per locale and stops anyone "translating" them. `resolveCv(messages)` merges
that skeleton with the translated prose.

Chrome is loaded the same way as gpool: `messages.ts` merges a live Tolgee
fetch over the committed message files, resolved server-side from a
`cv-language` cookie, then `Accept-Language`, then the default.

The remote fetch is best-effort — 3s timeout, and any failure falls back to the
cached copy and then to the committed files, so translations can never be the
reason a page fails to render. Switching language writes the cookie and
reloads, which is a round trip; that is the cost of the server-resolved model,
and the reason the tab title and search snippet can now follow the locale too.

`i18n-pull.mjs` normalises the region subtag and drops unsupported locales, so
a project tagged `es-ES` lands as `es.json` rather than an `es-ES.json` the app
never imports. It warns about any supported locale Tolgee has no export for.

**The pull is additive.** It deep-merges the export over the committed files
rather than replacing them, so a key that exists locally but not yet in Tolgee
survives instead of being deleted. Tolgee wins wherever it has a value. Without
this, `local:up` silently destroys any key added in code before it was pushed —
which cost this repo its entire CV content once.

The trade-off: a key deliberately removed in Tolgee lingers locally until it is
deleted here too. Stale keys are cheap; lost copy is not.

**Arrays survive the round trip only because the export asks them to.** Tolgee
has no array type: pushing `bullets: [...]` stores three keys literally named
`bullets[0]`, `bullets[1]`, `bullets[2]`. The pull sets `supportArrays=true` so
the export reassembles them. Without it the app finds no `bullets` array at
all, and — because the pull merges rather than replaces — the bracket keys pile
up next to the real ones instead of failing loudly.

**The pull sorts keys on write.** Tolgee exports alphabetically while these
files are authored in reading order, so an unsorted write makes every pull
rewrite half the file with a diff that changes nothing. Nothing reads these by
key order: `resolveCv` indexes jobs, projects and skills explicitly, education
already sorts, and languages is an array, whose order is preserved.

### Running a sync

```bash
npm run i18n:push
```

That is the **root** script, not the workspace one. The Tolgee CLI needs
`TOLGEE_API_URL`, `TOLGEE_API_KEY` and `TOLGEE_PROJECT_ID`, and the API key is
not on disk — it lives in OpenBao at `kv/cv`. `scripts/i18n-push.sh` supplies
all three the same way `local:up` already did for the pull.

Running `npm run i18n:push -w @cv/web` directly fails with `TOLGEE_API_URL is
required` followed by a misleading `Can't open config file` — the config is
there, it just throws while the CLI is requiring it.

The push uses `--force-mode OVERRIDE`: Tolgee's copy of every pushed key is
replaced by what is committed. That is right for keys added in code and wrong
if someone has been editing in the Tolgee UI, so pull first if in doubt.

`tolgee.config.cjs` maps files to languages explicitly rather than by template,
because the project tags Spanish as `es-ES` while the app's locale is `es`. Add
a locale there whenever one is added to `src/i18n/config.ts`.

The pull runs as part of `local:up`, or on its own with the same env:

```bash
npm run i18n:pull -w @cv/web
```

## Design-system changes made here

Four gaps surfaced while building this, all fixed in the vendored copy and
worth upstreaming to the design-system repo:

- **`Modal size="xl"` (860px)**, plus `box-sizing: border-box` and a
  `min-width: 0` reset on descendants. The case-study panel needs to be wider
  than `lg`, and the reset is what stops long content forcing a horizontal
  scrollbar inside the dialog.
- **`Textarea`** — the system had `Input` but no multi-line sibling. Mirrors
  `Input`'s states exactly.
- **`Button` anchor attributes** — `as="a"` was supported but `download`,
  `target` and `rel` were not in the prop types, even though the runtime
  already spreads them onto the element.
- **`.ds-btn` had no `box-sizing`.** It sets a fixed `height` and a 1px border,
  and browsers give `<button>` `border-box` but `<a>` `content-box` — so every
  `as="a"` button rendered 2px taller than its declared height in any app
  without a global reset, and this one has none. That is why the header's PDF
  link did not line up with the icon button beside it.

The header pairs a `primary` PDF button with an `outline` icon button, both at
38px: `md` for the link and `icon` for the globe. `sm` is 32px and the design
system has no small icon size, so an `sm` neighbour sits 6px short.

The CV uses the design system's **default** theme (neutral, blue accent, light
only), so unlike kini/gpool/operator-console there is no `themes/cv.css`.

## Checks

```bash
npm run precommit:checks
```

Gitleaks, lint, typecheck and build. There is no integration-e2e stage — with
no API and no database there is no stack to bring up; CI covers the runtime
path with a Docker smoke test that asserts the CV is present in the
server-rendered HTML.
