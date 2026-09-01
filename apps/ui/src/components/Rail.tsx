'use client';

import Image from 'next/image';

import { Button } from '@ds/components/core/Button.jsx';
import { SegmentedControl } from '@ds/components/navigation/SegmentedControl.jsx';

import { identity, portrait } from '@/content/cv';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { display, mono, monoPlain } from '@/lib/type';

const SECTION_KEYS = [
  { num: '01', key: 'nav.projects', href: '#projects' },
  { num: '02', key: 'nav.experience', href: '#experience' },
  { num: '03', key: 'nav.skills', href: '#skills' },
  { num: '04', key: 'nav.education', href: '#education' },
  { num: '05', key: 'nav.contact', href: '#contact' },
] as const;

export function Rail() {
  const { t, locale, setLocale } = useI18n();

  return (
    <aside
      className="cv-rail"
      style={{
        position: 'sticky',
        top: 40,
        alignSelf: 'start',
        display: 'grid',
        gap: 'var(--ds-space-5)',
        alignContent: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
        <span style={display(26, 1.05, '-0.01em')}>
          {identity.firstName} {identity.lastName}
        </span>
        <Image
          src={portrait}
          alt={`${identity.firstName} ${identity.lastName}`}
          width={132}
          height={132}
          priority
          style={{
            width: 132,
            height: 132,
            borderRadius: 'var(--ds-radius-full)',
            objectFit: 'cover',
            marginTop: 'var(--ds-space-1)',
            background: 'var(--ds-color-surface-2)',
          }}
        />
      </div>

      <nav style={{ display: 'grid', gap: 2 }}>
        {SECTION_KEYS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="cv-nav-link"
            style={{
              ...monoPlain(12),
              display: 'grid',
              gridTemplateColumns: '24px 1fr',
              alignItems: 'baseline',
              gap: 'var(--ds-space-2)',
              padding: '6px 0',
              textDecoration: 'none',
              borderTop: '1px solid var(--ds-color-border)',
            }}
          >
            <span style={{ color: 'var(--ds-color-fg-faint)' }}>{section.num}</span>
            <span>{t(section.key)}</span>
          </a>
        ))}
      </nav>

      <div
        className="cv-no-print"
        style={{ display: 'grid', gap: 'var(--ds-space-3)', justifyItems: 'start' }}
      >
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          {t('rail.pdf')}
        </Button>
        <SegmentedControl
          options={SUPPORTED_LOCALES.map((code) => ({
            value: code,
            label: code.toUpperCase(),
          }))}
          value={locale}
          onChange={(value: string) => setLocale(value as Locale)}
          ariaLabel={t('rail.language')}
        />
      </div>
    </aside>
  );
}
