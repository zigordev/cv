/**
 * CV content model.
 *
 * PLACEHOLDER CONTENT — the persona below ("Alex Moreno", the four employers,
 * the four projects) comes from the design handoff and is realistic but not
 * real. Replace every value with the real CV before shipping; keep the shapes.
 *
 * Body prose here is English-only by design: the UI chrome is translated
 * through Tolgee (see `messages/`), the CV substance is not. See README.
 */

export interface Job {
  role: string;
  company: string;
  period: string;
  location: string;
  summary: string;
  bullets: string[];
}

export interface ProjectPiece {
  step: string;
  title: string;
  text: string;
}

export interface ProjectStat {
  label: string;
  value: string;
  hint: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  id: string;
  name: string;
  year: string;
  role: string;
  tagline: string;
  stack: string[];
  /** Modal Overview tab: screenshot slot, then problem / approach. */
  screenshot?: string;
  problem: string;
  approach: string;
  /** Modal Architecture tab. */
  pieces: ProjectPiece[];
  decisions: string[];
  /** Modal Results tab. */
  stats: ProjectStat[];
  lessons: string[];
  links: ProjectLink[];
}

export interface SkillGroup {
  group: string;
  note: string;
  items: string[];
}

export interface Education {
  degree: string;
  school: string;
  period: string;
  /** Optional supporting line — thesis, distinction, focus. */
  detail?: string;
}

export interface ContactRow {
  label: string;
  value: string;
}

/** Rail portrait, 132x132 circle. Replace with a real photo in `public/`. */
export const portrait = '/portrait.png';

export const identity = {
  firstName: 'Zigor',
  lastName: 'López',
  // PLACEHOLDER — replace with the real address and handles below.
  email: 'alex@moreno.dev',
  /** Role and location. Content, not UI chrome, so it lives here rather than
   *  in Tolgee — a pull would otherwise overwrite it on the next stack start. */
  title: 'Software Engineer',
  location: 'Bilbao',
  timezone: 'UTC+1/UTC+2',
  /**
   * The hero statement. Split in two so the second clause keeps the design's
   * italic accent treatment; collapse into one field if you would rather it
   * read as a single unbroken line.
   */
  headline: 'Emptiness and cleanliness leave room',
  headlineAccent: 'for appreciation and for understanding.',
  /**
   * The opening paragraph on the page. Content, not UI chrome, so it lives
   * here rather than in Tolgee — a pull would otherwise overwrite it.
   * Distinct from `summary` below, which is written for the PDF and the
   * parsers that read it.
   */
  lede: 'Applying "Ma", or "less is more", to software engineering. In a world where the tech stack grows bigger and the layers keep multiplying, one of the keys to success is building a simple system.',
  /**
   * PLACEHOLDER — write your own. This is the professional summary at the top
   * of the PDF: the first thing a human reads and the densest keyword block an
   * applicant tracking system indexes. Two or three sentences, naming the
   * technologies and the kind of work you want matched against.
   */
  summary:
    'Software engineer working on developer platforms, build pipelines and the shared infrastructure that product teams depend on. Comfortable across TypeScript, Node and Rust, from event-driven backends to the deploy path that ships them.',
  /** Languages the person speaks — CV content, independent of the UI locales
   *  in `i18n/config.ts`. Drives the meta row and the JSON-LD `knowsLanguage`. */
  languages: ['EN', 'ES'],
};

export const jobs: Job[] = [
  {
    role: 'Software Engineer, Developer Platform',
    company: 'Northbound',
    period: '2023 — Present',
    location: 'Remote (Bilbao)',
    summary:
      'Own the build, deploy and observability path for 60 engineers across nine product teams.',
    bullets: [
      'Rebuilt CI on remote caching and merge queues: median pipeline 51 min → 9 min, flake rate under 1%.',
      'Introduced a service template that ships with tracing, dashboards and an on-call runbook by default — new services reach production in two days instead of three weeks.',
      'Led the migration of 40 services off a shared Postgres as 11 reversible steps, with zero customer-visible downtime.',
    ],
  },
  {
    role: 'Senior Full-Stack Engineer',
    company: 'Cartogram',
    period: '2020 — 2023',
    location: 'Bilbao, ES',
    summary:
      'Second engineer on a geospatial analytics product; grew with it from prototype to 4,000 paying seats.',
    bullets: [
      'Built the tile pipeline and query layer that let customers render 20M-point datasets interactively.',
      'Designed the permissions model still in use today — one policy evaluator shared by API, UI and exports.',
      'Mentored four engineers; two now lead teams.',
    ],
  },
  {
    role: 'Full-Stack Engineer',
    company: 'Meridian Labs',
    period: '2017 — 2020',
    location: 'Berlin, DE',
    summary: 'Consultancy work: shipped eight client products, mostly in regulated industries.',
    bullets: [
      'Delivered an insurance claims portal handling 12k claims a month, replacing a paper process.',
      'Standardised the studio front-end stack and token setup reused on every later project.',
    ],
  },
  {
    role: 'Junior Developer',
    company: 'Studio Vela',
    period: '2015 — 2017',
    location: 'Bilbao, ES',
    summary: 'First job. Marketing sites, CMS work, and an unreasonable amount of CSS debugging.',
    bullets: [
      'Built and maintained 20+ client sites; learned to read a stack trace before guessing.',
    ],
  },
];

export const projects: Project[] = [
  {
    id: 'gpool',
    name: 'gpool',
    year: '2026',
    role: 'Solo — platform, API & web',
    tagline:
      'A real-time football pool platform: private pools, live scoring, and an auditable trail of every point.',
    stack: ['Next.js', 'NestJS', 'Postgres', 'Kafka'],
    problem:
      'A prediction pool needs more than a spreadsheet: authentication, scoring that settles on a schedule, notifications, and a record of why anyone holds the points they do. Every one of those is a service, and standing them up per project does not scale.',
    approach:
      'One monorepo with a NestJS API and a Next.js web app, both joining a shared platform rather than owning their own infrastructure. Secrets, translations, the event broker and observability all come from platform-ops; gpool ships only the two containers that are actually its own.',
    pieces: [
      {
        step: '01',
        title: 'API',
        text: 'NestJS monolith covering auth, pools and RUM. Runs database migrations on startup, exposes an OpenAPI spec, and publishes email intent as Kafka events rather than sending mail itself.',
      },
      {
        step: '02',
        title: 'Web',
        text: 'Next.js App Router in standalone output. Translations are pulled from Tolgee at boot; the container starts under a wrapper that fetches its secrets from OpenBao and refuses to boot without the keys it declares.',
      },
      {
        step: '03',
        title: 'Delivery',
        text: 'Images build to ECR on release, a bundle lands in S3, and SSM drives a compose deploy on the shared EC2 host. CI gates on lint, typecheck, coverage, a compose integration smoke, gitleaks, SBOM and a Trivy scan.',
      },
    ],
    decisions: [
      'Secrets are fetched at boot by a wrapper process, never baked into an image or committed to an env file — a leaked app token exposes one kv path, not the store.',
      'Email is an event, not a call. The API publishes to a topic and a shared service owns delivery, idempotency and dead-lettering.',
      'CI regenerates the web API contract from the running API and fails on drift, so the client and server cannot disagree silently.',
    ],
    // Add your own figures — deploy times, pool counts, uptime.
    stats: [],
    lessons: [],
    links: [{ label: 'github.com/zigordev/gpool', href: 'https://github.com/zigordev/gpool' }],
  },
  {
    id: 'platform-ops',
    name: 'platform-ops',
    year: '2026',
    role: 'Solo — infrastructure',
    tagline: 'The shared operations stack every other project attaches to instead of rebuilding.',
    stack: ['Terraform', 'Docker Compose', 'OpenBao', 'Redpanda'],
    problem:
      'Five applications each needed secret storage, translations, an event broker and observability. Duplicating that per repository means five OpenBao instances to unseal and five ways to be inconsistent.',
    approach:
      'One ops stack, one external Docker network, and a rule that applications own only their own containers. An app declares which secret path it reads and which topics it uses; everything underneath is shared and versioned in one place.',
    pieces: [
      {
        step: '01',
        title: 'Ops stack',
        text: 'OpenBao for secrets, Redpanda for events, Tolgee for translations, and Prometheus, Grafana, Loki, Alloy, Jaeger and an OTel collector for signals — composed locally and in production from the same manifests.',
      },
      {
        step: '02',
        title: 'Integration seam',
        text: 'A single external Docker network. An application joins it, resolves services by alias, and needs to know nothing else about the topology.',
      },
      {
        step: '03',
        title: 'Guardrails',
        text: 'Commit hooks that scan for secrets, parse every workflow, render every compose file and check Terraform formatting before anything reaches CI.',
      },
    ],
    decisions: [
      'Per-application OpenBao policies scoped to exactly one kv path, so an app token is useless against any other app.',
      'The same compose manifests describe local and production, so a local reproduction is a real reproduction.',
    ],
    stats: [],
    lessons: [],
    links: [
      {
        label: 'github.com/zigordev/platform-ops',
        href: 'https://github.com/zigordev/platform-ops',
      },
    ],
  },
  {
    id: 'design-system',
    name: 'design-system',
    year: '2026',
    role: 'Solo — design & code',
    tagline:
      'A technology-agnostic token and component library other products share without agreeing on a CSS framework.',
    stack: ['React', 'CSS custom properties', 'oklch'],
    problem:
      'Three products had drifted into three styling technologies — plain CSS classes, Tailwind utilities and CVA variants — and no shared visual language. Picking one framework would have meant rewriting two applications.',
    approach:
      'Components are plain React styled only through CSS custom properties, with no Tailwind, no CSS-in-JS and no build step. Any of the three can import them as-is, and each supplies its own theme file rather than editing component source.',
    pieces: [
      {
        step: '01',
        title: 'Tokens',
        text: 'Colour, typography, spacing, radius, shadow and motion as oklch-based custom properties, with one neutral default theme.',
      },
      {
        step: '02',
        title: 'Components',
        text: 'Primitives grouped by concern — core, forms, feedback, data-display, navigation, overlay, icons — each referencing tokens only, never a literal colour.',
      },
      {
        step: '03',
        title: 'Themes',
        text: 'One file per product overriding colour tokens. A full reskin touches zero component files.',
      },
    ],
    decisions: [
      'Themes override colour only. Shape, type scale and spacing stay on shared base tokens, so every product renders identical geometry and differs solely in paint.',
      'Vendored into each consumer rather than published as a package — the products are private and a copy keeps the dependency graph flat.',
    ],
    stats: [],
    lessons: [],
    links: [
      {
        label: 'github.com/zigordev/design-system',
        href: 'https://github.com/zigordev/design-system',
      },
    ],
  },
  {
    id: 'trading-bot',
    name: 'trading-bot',
    year: '2026',
    role: 'Solo — Rust & TypeScript',
    tagline:
      'A trading platform split between a Rust hot path and a TypeScript control plane with an operator console.',
    stack: ['Rust', 'TypeScript', 'Next.js', 'Postgres'],
    problem:
      'A strategy that runs unattended needs two very different things: a fast, predictable execution path, and a supervision surface a human can read at a glance. Building both in one language means compromising one of them.',
    approach:
      'Latency-sensitive work lives in Rust crates; orchestration and supervision live in TypeScript. The two halves meet at a control plane, with a Next.js operator console on top.',
    pieces: [
      {
        step: '01',
        title: 'Rust crates',
        text: 'Separate crates for market data, the strategy engine, execution, and research backtesting, so the backtest and the live path can share the same strategy code.',
      },
      {
        step: '02',
        title: 'Control plane',
        text: 'A TypeScript service coordinating the crates and owning the operational API.',
      },
      {
        step: '03',
        title: 'Operator console',
        text: 'A Next.js supervision UI built on Tailwind and Radix, sharing the design system with the other products.',
      },
    ],
    decisions: [
      'Backtesting and live execution consume the same strategy crate, so a result that cannot be reproduced offline is a bug rather than a mystery.',
    ],
    stats: [],
    lessons: [],
    links: [
      { label: 'github.com/zigordev/trading-bot', href: 'https://github.com/zigordev/trading-bot' },
    ],
  },
  {
    id: 'notifications',
    name: 'notifications',
    year: '2026',
    role: 'Solo — backend',
    tagline:
      'A Kafka-backed email service the other products delegate delivery to, with idempotency and crash recovery built in.',
    stack: ['NestJS', 'Kafka', 'Postgres', 'Handlebars'],
    problem:
      'Every product eventually needs to send mail, and every product that does it inline reinvents retries, deduplication and the question of what happened to a message that never arrived.',
    approach:
      'One consumer owns delivery for all of them. Producers publish an intent event and stop caring; the service validates the contract, renders a localised template, sends it, and keeps a durable record of every attempt.',
    pieces: [
      {
        step: '01',
        title: 'Consumer',
        text: 'Reads a versioned topic under a stable consumer group and validates every event against an explicit contract, rejecting malformed payloads as non-retryable rather than looping on them.',
      },
      {
        step: '02',
        title: 'Delivery',
        text: "Atomic idempotency claims stop duplicate sends, and processing leases let a crashed worker's in-flight messages be picked up rather than stranded.",
      },
      {
        step: '03',
        title: 'Templates',
        text: 'Handlebars templates keyed by source application and template id, resolved per locale, with data escaped on render so sender-controlled content cannot inject markup.',
      },
    ],
    decisions: [
      'Invalid payloads fail as non-retryable and go to a durable dead-letter record, because retrying a malformed message forever is a worse outcome than losing it loudly.',
      'A versioned topic name, so a contract change is a new topic rather than a silent break for every producer.',
    ],
    stats: [],
    lessons: [],
    links: [
      {
        label: 'github.com/zigordev/notifications',
        href: 'https://github.com/zigordev/notifications',
      },
    ],
  },
  {
    id: 'kini',
    name: 'kini',
    year: '2026',
    role: 'Solo — API & web',
    tagline:
      'The first football pool platform, and the one that taught me what gpool needed to be.',
    stack: ['Next.js', 'NestJS', 'Postgres', 'Tolgee'],
    problem:
      'The original attempt at a pool platform: teams, invitations, and scoring, built before there was any shared infrastructure to lean on.',
    approach:
      'A NestJS API and Next.js client in one monorepo, with monitoring wired in locally. Much of what it worked out — the compose layout, the Tolgee translation flow, the release and deploy workflows — became the template the later projects started from.',
    pieces: [
      {
        step: '01',
        title: 'API and web',
        text: 'NestJS backend and Next.js client, sharing a compose stack and a single set of CI workflows.',
      },
      {
        step: '02',
        title: 'What carried forward',
        text: 'The translation workflow, the commit and release automation, and the local-first compose layout were all extracted and reused rather than rebuilt.',
      },
    ],
    decisions: [
      'Kept as its own repository rather than folded into gpool, so the rewrite could change its mind about the architecture without rewriting history.',
    ],
    stats: [],
    lessons: [],
    links: [{ label: 'github.com/zigordev/kini', href: 'https://github.com/zigordev/kini' }],
  },
];

export const skillGroups: SkillGroup[] = [
  {
    group: 'Languages',
    note: 'Daily first, then fluent enough to be useful.',
    items: ['TypeScript', 'Go', 'Python', 'SQL', 'Bash', 'Rust'],
  },
  {
    group: 'Product front-end',
    note: 'Accessible, fast, no framework religion.',
    items: ['React', 'SvelteKit', 'Design systems', 'Web performance', 'Testing Library'],
  },
  {
    group: 'Backend & data',
    note: 'Boring architecture, carefully chosen.',
    items: ['Postgres', 'Event-driven services', 'gRPC', 'Timescale', 'Redis'],
  },
  {
    group: 'Platform & practice',
    note: 'How the work reaches production.',
    items: [
      'Kubernetes',
      'Terraform',
      'CI/CD',
      'OpenTelemetry',
      'Incident review',
      'Technical writing',
    ],
  },
];

export const education: Education[] = [
  {
    degree: 'B.Sc. Mathematics',
    school: 'UNED',
    period: '2026 — Present',
  },
  {
    degree: 'B.Sc. Computer Science',
    school: 'University of the Basque Country',
    period: '2013 — 2017',
  },
];

export const contactRows: ContactRow[] = [
  { label: 'Email', value: 'alex@moreno.dev' },
  { label: 'GitHub', value: 'https://github.com/alexmoreno' },
  { label: 'LinkedIn', value: 'https://linkedin.com/in/alexmoreno' },
  { label: 'Phone', value: '+351900000000' },
];
