'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import en from '../../messages/en.json';
import es from '../../messages/es.json';
import { DEFAULT_LOCALE, LANGUAGE_STORAGE_KEY, isLocale, type Locale } from './config';
import { createTranslator, type Messages } from './translator';

/**
 * Unlike the other platform apps, the CV bundles every locale client-side and
 * switches in state rather than round-tripping a cookie through the server.
 * The translated surface is UI chrome only — a few dozen short strings — so
 * all three locales together are smaller than one extra request, and the
 * language switch stays instant the way the design calls for.
 */
const CATALOGUES: Record<Locale, Messages> = {
  en: en as Messages,
  es: es as Messages,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createTranslator>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read after mount, not during render: the server has no access to
  // localStorage, and seeding state from it directly would desync hydration.
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Private mode or a storage-blocked browser: the switch still works for
      // this session, it just will not be remembered.
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: createTranslator(CATALOGUES[locale]) }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
