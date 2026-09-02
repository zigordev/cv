import type { Messages } from '@/i18n/translator';

/**
 * The CV's shape. Every word of it lives in Tolgee, like the rest of the app.
 *
 * What stays here is only what reads identically in every language and is not
 * translatable copy: ids, ordering, technology names and URLs. Putting
 * those in the translation store would invite a translator to "translate"
 * `Next.js` or a GitHub URL, and would duplicate them once per locale for no
 * benefit.
 *
 * Everything a reader actually reads — headline, roles, case studies, section
 * names, the PDF's headings — comes from `messages.cv.*`, which the loader
 * assembles from Tolgee merged over the committed message files.
 */

/* -------------------------------------------------------------------------- */
/* Resolved shapes the components consume                                     */
/* -------------------------------------------------------------------------- */

export interface Job {
  company: string;
  role: string;
  location: string;
  period: string;
  summary: string;
  bullets: string[];
}

export interface ProjectPiece {
  step: string;
  title: string;
  text: string;
}

/**
 * What a project is, not what it is built with.
 *
 * `product` is something with users; `core` is shared machinery the products
 * are built on. Worth distinguishing because the two read very differently to
 * a reviewer: a product shows judgement about people, a core project shows
 * judgement about systems.
 */
export type ProjectKind = 'product' | 'core';

/**
 * How far a product actually got. Only products carry one: the core projects
 * are all in use by definition — every product here runs on them — so a status
 * on those would say nothing.
 *
 * Worth being explicit about rather than letting a reader assume: shipping
 * something to production is a different claim from having built a proof of
 * concept, and a CV that blurs the two invites the question at interview.
 */
export type ProjectStatus = 'production' | 'development' | 'poc';

export interface Project {
  id: string;
  kind: ProjectKind;
  status?: ProjectStatus;
  /**
   * Where a reader can use the running thing, for products that have one.
   * Separate from `links` because a live product and its source repository are
   * different invitations, and the live one is worth more to a non-engineer.
   */
  url?: string;
  name: string;
  stack: string[];
  screenshot?: string;
  role: string;
  tagline: string;
  problem: string;
  approach: string;
  pieces: ProjectPiece[];
  decisions: string[];
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
  detail?: string;
}

export interface LanguageEntry {
  name: string;
  level: string;
}

/**
 * Prose for the project architecture diagrams. Only the words: the service,
 * crate and technology names they draw are proper nouns and live in the
 * components alongside the geometry, for the same reason technology names live
 * in this file rather than in the translation store.
 *
 * Notes are rendered inside fixed-width boxes, so they have to stay short —
 * roughly 26 characters at 160px and 32 at 200px, in every language.
 */
interface DiagramCopy {
  alt: string;
  caption: string;
}

export interface PlatformOpsDiagramCopy extends DiagramCopy {
  seam: string;
  groups: { secrets: string; events: string; observability: string };
  notes: {
    openbao: string;
    tolgee: string;
    redpanda: string;
    console: string;
    traces: string;
    metrics: string;
    logs: string;
    grafana: string;
  };
}

export interface CvDiagramCopy extends DiagramCopy {
  notes: { content: string; page: string; pdf: string; events: string; handoff: string };
}

export interface GpoolDiagramCopy extends DiagramCopy {
  notes: { web: string; api: string; db: string; events: string; handoff: string };
}

export interface DesignSystemDiagramCopy extends DiagramCopy {
  notes: { tokens: string; components: string; themes: string; products: string };
}

export interface TradingBotDiagramCopy extends DiagramCopy {
  lanes: { hot: string; control: string };
  notes: {
    marketData: string;
    strategy: string;
    execution: string;
    backtest: string;
    controlPlane: string;
    console: string;
  };
}

export interface NotificationsDiagramCopy extends DiagramCopy {
  notes: {
    topic: string;
    consumer: string;
    idempotency: string;
    templates: string;
    email: string;
    deadLetter: string;
  };
}

export interface KiniDiagramCopy extends DiagramCopy {
  notes: { kini: string; carried: string; into: string };
}

export interface Diagrams {
  cv: CvDiagramCopy;
  platformOps: PlatformOpsDiagramCopy;
  gpool: GpoolDiagramCopy;
  designSystem: DesignSystemDiagramCopy;
  tradingBot: TradingBotDiagramCopy;
  notifications: NotificationsDiagramCopy;
  kini: KiniDiagramCopy;
}

/* -------------------------------------------------------------------------- */
/* Locale-invariant                                                           */
/* -------------------------------------------------------------------------- */

/** Rail portrait, rendered as a 132px circle. Stored square at 2x. */
export const portrait = '/portrait.jpg';

const person = {
  firstName: 'Zigor',
  lastName: 'López',
};

/*
 * No contact details live here, by decision rather than omission.
 *
 * Nothing this app publishes — the page, the PDF at `public/cv-*.pdf`, or the
 * schema.org Person in the document head — carries an email address, a phone
 * number or a profile link. The contact form is the only route in: it reaches
 * the same inbox through `CONTACT_RECIPIENT_EMAIL` in OpenBao, so the address
 * is never in anything served.
 *
 * The cost is understood and accepted: an ATS keys on the email address, so a
 * record parsed from this PDF has no contact field, and a reader who keeps the
 * file has to return to the site to reach anyone. Restoring a detail means
 * putting it back in all three places above, not just this one.
 */

/** Order is meaningful: reverse-chronological. Keys index into `cv.jobs`. */
const JOB_IDS = ['dehn', 'wise-security', 'everis', 'entelgy', 'dominion'] as const;

/** Keys index into `cv.projects`; the rest is technology names and URLs. */
const PROJECT_SKELETON: Array<Omit<Project, keyof ProjectProse> & { id: string }> = [
  {
    id: 'cv',
    kind: 'product',
    status: 'production',
    name: 'cv',
    stack: ['Next.js', 'Tolgee', 'OpenBao', 'Kafka'],
  },
  {
    id: 'gpool',
    kind: 'product',
    status: 'production',
    url: 'https://gpool.zigordev.com',
    name: 'gpool',
    stack: ['Next.js', 'NestJS', 'Postgres', 'Kafka'],
  },
  {
    id: 'trading-bot',
    kind: 'product',
    status: 'development',
    name: 'trading-bot',
    stack: ['Rust', 'TypeScript', 'Next.js', 'Postgres'],
  },
  {
    id: 'kini',
    kind: 'product',
    status: 'poc',
    name: 'kini',
    stack: ['Next.js', 'NestJS', 'Postgres', 'Tolgee'],
  },
  {
    id: 'platform-ops',
    kind: 'core',
    name: 'platform-ops',
    stack: ['Terraform', 'Docker Compose', 'OpenBao', 'Redpanda'],
  },
  {
    id: 'notifications',
    kind: 'core',
    name: 'notifications',
    stack: ['NestJS', 'Kafka', 'Postgres', 'Handlebars'],
  },
  {
    id: 'design-system',
    kind: 'core',
    name: 'design-system',
    stack: ['React', 'CSS custom properties', 'oklch'],
  },
];

/**
 * The products, by name, derived rather than listed.
 *
 * The architecture diagrams draw this set — the applications sitting on the
 * shared platform, and the products that vendor the design system — so adding a
 * product here puts it into the diagrams without editing any of them. Hardcoded
 * name lists are how a diagram comes to disagree with the page above it.
 */
export const PRODUCT_NAMES: string[] = PROJECT_SKELETON.filter(
  (project) => project.kind === 'product'
).map((project) => project.name);

/**
 * Technology names, so they stay out of the translation store.
 *
 * Every entry is backed by something on this CV — a role in the experience
 * section or a project in the case studies. Nothing is listed for coverage:
 * a reader who cross-references a skill against the work should find it.
 */
const SKILL_ITEMS: string[][] = [
  ['TypeScript', 'Java', 'JavaScript', 'SQL', 'Rust'],
  ['React', 'Vue', 'Angular', 'Design systems'],
  ['Spring Boot', 'NestJS', 'Node.js', 'Microservices', 'Postgres', 'Kafka'],
  ['Docker', 'Terraform', 'CI/CD', 'Observability'],
];

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

type ProjectProse = Pick<
  Project,
  'role' | 'tagline' | 'problem' | 'approach' | 'pieces' | 'decisions'
>;

/** The `cv.*` subtree of the message bundle, as this module expects it. */
interface CvMessages {
  identity: {
    title: string;
    location: string;
    headline: string;
    lede: string;
    summary: string;
  };
  labels: {
    sections: Record<string, string>;
    pdf: Record<string, string>;
    projectKinds: Record<ProjectKind, string>;
    projectStatuses: Record<ProjectStatus, string>;
  };
  languages: LanguageEntry[];
  diagrams: Diagrams;
  jobs: Record<string, Omit<Job, never>>;
  projects: Record<string, ProjectProse>;
  skills: Record<string, { group: string; note: string }>;
  education: Record<string, { degree: string; school: string; period: string; detail?: string }>;
}

/**
 * Merges the translated copy with the locale-invariant skeleton.
 *
 * Throws rather than rendering `undefined` everywhere if `cv.*` is absent:
 * that only happens when the message files have been overwritten by a Tolgee
 * pull that does not yet know these keys, and a loud failure names the cause
 * where a blank CV would not.
 */
export function resolveCv(messages: Messages) {
  const cv = messages.cv as unknown as CvMessages | undefined;
  if (!cv?.identity) {
    throw new Error(
      'Missing `cv.*` translations. Push the CV keys to Tolgee, or restore ' +
        'apps/ui/messages/*.json — a pull has overwritten them.'
    );
  }

  return {
    identity: { ...person, ...cv.identity },
    labels: cv.labels,
    languages: cv.languages,
    diagrams: cv.diagrams,
    jobs: JOB_IDS.map((id): Job => cv.jobs[id]),
    projects: PROJECT_SKELETON.map((skeleton): Project => ({
      ...skeleton,
      ...cv.projects[skeleton.id],
    })),
    skillGroups: SKILL_ITEMS.map((items, index): SkillGroup => ({
      items,
      ...cv.skills[String(index)],
    })),
    education: Object.keys(cv.education)
      .sort()
      .map((key): Education => cv.education[key]),
    portrait,
  };
}

export type Cv = ReturnType<typeof resolveCv>;
