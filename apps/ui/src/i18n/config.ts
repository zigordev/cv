export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const LANGUAGE_COOKIE = 'cv-language';

/** Flag and native name per locale, matching how the other apps label theirs. */
export const LOCALE_META: Record<Locale, { label: string; flagCode: 'gb' | 'es' }> = {
  en: { label: 'English', flagCode: 'gb' },
  es: { label: 'Español', flagCode: 'es' },
};
