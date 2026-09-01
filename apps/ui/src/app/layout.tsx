import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';

import { I18nProvider } from '@/i18n/client';
import { identity } from '@/content/cv';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const fullName = `${identity.firstName} ${identity.lastName}`;
const pageTitle = `${fullName} — ${identity.title}`;
// PLACEHOLDER copy — this is the snippet search engines show. Replace it.
const pageDescription = `${identity.title} in ${identity.location}, working on developer platforms, build pipelines and shared infrastructure.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    type: 'profile',
  },
};

/**
 * schema.org Person, so the CV is machine-readable to search engines and to
 * the recruiter tooling that scrapes them.
 */
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: fullName,
  email: `mailto:${identity.email}`,
  jobTitle: identity.title,
  knowsLanguage: identity.languages.map((code) => code.toLowerCase()),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          // Serialised from a literal defined above — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
