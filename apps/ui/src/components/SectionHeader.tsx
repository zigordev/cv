'use client';

import { display, mono } from '@/lib/type';

/**
 * Every section except the intro shares this header: a numbered mono kicker
 * over a display heading whose second clause is usually italic and muted.
 */
export function SectionHeader({
  num,
  kicker,
  titleA,
  titleB,
}: Readonly<{
  num: string;
  kicker: string;
  titleA?: string;
  titleB?: string;
}>) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--ds-space-2)',
        paddingBottom: 'var(--ds-space-4)',
        borderBottom: '1px solid var(--ds-color-border-strong)',
      }}
    >
      <span style={mono(11, '0.16em')}>
        {num} — {kicker}
      </span>
      {titleA ? (
        <h2 style={display('clamp(30px, 3.4vw, 44px)', 1.05, '-0.02em')}>
          {titleA}
          {titleB ? (
            <>
              {' '}
              <em style={{ fontStyle: 'italic', color: 'var(--ds-color-fg-muted)' }}>{titleB}</em>
            </>
          ) : null}
        </h2>
      ) : null}
    </div>
  );
}
