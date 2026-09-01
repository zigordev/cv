'use client';

import { identity } from '@/content/cv';
import { useI18n } from '@/i18n/client';
import { display, mono, monoPlain } from '@/lib/type';

export function Intro() {
  const { t } = useI18n();

  return (
    <section id="intro">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        {/* Role and the working details share one line: they answer the same
            question — who this is and how to work with them — and stacking
            them put an unrelated gap between the headline and the lede. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: 'var(--ds-space-6)',
          }}
        >
          <span style={mono(11, '0.16em', 'var(--ds-color-accent)')}>
            {identity.title} · {identity.location}
          </span>
          <span style={monoPlain(12)}>
            {identity.timezone} · {identity.languages.join(' · ')}
          </span>
        </div>

        <h1
          style={{
            ...display('clamp(52px, 7.4vw, 104px)', 0.94, '-0.025em'),
            textWrap: 'balance',
          }}
        >
          {identity.headline}{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--ds-color-accent)' }}>
            {identity.headlineAccent}
          </em>
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: '52ch',
            fontSize: 19,
            lineHeight: 1.55,
            color: 'var(--ds-color-fg-muted)',
            textWrap: 'pretty',
          }}
        >
          {identity.lede}
        </p>
      </div>
    </section>
  );
}
