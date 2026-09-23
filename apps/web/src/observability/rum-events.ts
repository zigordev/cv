export const RUM_INTERACTIONS = [
  'ask-opened',
  'ask-submitted',
  'ask-answer-shown',
  'ask-failed',
  'contact-opened',
  'contact-sent',
  'contact-failed',
  'cv-downloaded',
  'case-study-opened',
  'locale-switched',
  'render-error',
] as const;

export type RumInteraction = (typeof RUM_INTERACTIONS)[number];

export const RUM_PAGES = ['/'] as const;

export const RUM_VOCABULARY = {
  customInteractions: RUM_INTERACTIONS,
  pages: RUM_PAGES,
} as const;
