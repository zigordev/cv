import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';

import { I18nProvider } from '@/i18n/client';
import { getLocale, getMessages } from '@/i18n/server';
import { nonceFrom } from '@/lib/csp';
import { resolveCv } from '@/content/cv';

import './globals.css';
import { RumProvider } from '@/observability/RumProvider';

// Variable, not fixed cuts. The design system's weight tokens are 400 / 550 /
// 650 / 800; requesting static 400/500/600/800 meant 550 and 650 were never
// actually loaded and the browser snapped or synthesised them. The variable
// face covers the whole range and drops the 800 cut nothing on screen used.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = localFont({
  src: [
    { path: './fonts/instrument-serif-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/instrument-serif-latin-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument-serif',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/**
 * Locale-aware, which only became possible once the locale was resolved on the
 * server: the tab title and the search snippet now follow the language the
 * visitor is actually reading rather than always being English.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { identity } = resolveCv(await getMessages());
  const title = `${identity.firstName} ${identity.lastName} — ${identity.title}`;
  // PLACEHOLDER copy — this is the snippet search engines show. Replace it.
  const description = `${identity.title}, ${identity.location}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Resolved server-side from the cookie, then Accept-Language, then default.
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const { identity, languages } = resolveCv(messages);
  const nonce = nonceFrom((await headers()).get('content-security-policy-report-only'));

  /**
   * schema.org Person, so the CV is machine-readable to search engines and to
   * the recruiter tooling that scrapes them.
   */
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `${identity.firstName} ${identity.lastName}`,
    jobTitle: identity.title,
    knowsLanguage: languages.map((language) => language.name),
  };

  return (
    <html
      lang={locale}
      data-theme="light"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <RumProvider />
        <script
          type="application/ld+json"
          nonce={nonce}
          // Serialised from a literal defined above — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
