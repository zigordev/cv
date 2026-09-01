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
| CV content    | `apps/ui/src/content/cv.ts` — typed, one file                       |
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

Printing does not restyle this page. `PrintResume` is a separate single-column
document that replaces it entirely under `@media print`; see the comment at the
top of that component for why, and what it optimises for.

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

UI chrome is translated; the CV body prose (job bullets, case-study text) is
English only. Both locales are bundled client-side and switched in state,
rather than round-tripping a cookie like the other apps — the translated
surface is a few dozen short strings, so the switch stays instant.

Keys live in Tolgee. Adding one locally and not pushing it means the next pull
overwrites it — `local:up` runs a pull, so an unpushed key survives exactly
until the next stack start.

`i18n-pull.mjs` normalises the region subtag and drops unsupported locales, so
a project tagged `es-ES` lands as `es.json` rather than an `es-ES.json` the app
never imports. It warns about any supported locale Tolgee has no export for.

```bash
npm run i18n:pull -w @cv/web
npm run i18n:push -w @cv/web
```

## Design-system changes made here

Two gaps surfaced while building this, both fixed in the vendored copy and
worth upstreaming to the design-system repo:

- **`Modal size="xl"` (860px)**, plus `box-sizing: border-box` and a
  `min-width: 0` reset on descendants. The case-study panel needs to be wider
  than `lg`, and the reset is what stops long content forcing a horizontal
  scrollbar inside the dialog.
- **`Textarea`** — the system had `Input` but no multi-line sibling. Mirrors
  `Input`'s states exactly.

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
