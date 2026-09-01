'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';

import { LANGUAGE_COOKIE, type Locale } from './config';
import { createTranslator, type Messages } from './translator';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createTranslator>;
  /** The raw bundle — the CV reads structured prose from `cv.*`, not just
   *  flat lookups, so it needs the tree rather than only the translator. */
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Locale and messages are resolved on the server and handed down, matching the
 * other apps. The catalogues are no longer bundled into the client, so what
 * renders is what the server resolved: Tolgee merged over the committed
 * message files, with the files alone if Tolgee is unreachable.
 *
 * Switching writes a cookie and reloads rather than swapping state in place.
 * That round trip is the deliberate cost of the server-resolved model — the
 * client no longer carries a second copy of the translations to switch to.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: Readonly<{ locale: Locale; messages: Messages; children: React.ReactNode }>) {
  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;

      /*
       * Drop any anchor before reloading.
       *
       * `reload()` keeps the URL intact, hash included — so once a reader has
       * used the rail the address is `…#skills`, and every later language
       * switch re-jumps there no matter how far they have scrolled since.
       * Switching language is not navigation and should not move anyone.
       *
       * `replaceState` rewrites the current entry without navigating, so the
       * reload that follows has no anchor to honour and the browser's own
       * scroll restoration puts the reader back where they were. A reader who
       * really is at that section stays there — they are scrolled to it — so
       * this only removes the jump, never the position.
       */
      if (globalThis.location.hash) {
        const { pathname, search } = globalThis.location;
        globalThis.history.replaceState(null, '', `${pathname}${search}`);
      }
      globalThis.location.reload();
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, messages, t: createTranslator(messages) }),
    [locale, messages, setLocale]
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
