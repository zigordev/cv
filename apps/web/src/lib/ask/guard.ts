const CONTACT_PATTERNS: readonly RegExp[] = [
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
  /\+\d{1,3}[\s.-]?\d(?:[\s.-]?\d){6,13}/,
  /(?<![\w.,/+-])[679]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?![\w/]|[.,]\d)/,
  /\b(?:linkedin\.com\/in|twitter\.com|x\.com|t\.me|wa\.me)\//i,
];

export function containsContactDetail(text: string): boolean {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}
