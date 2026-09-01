'use client';

import { useCv } from '@/content/useCv';
import { display } from '@/lib/type';

export function Intro() {
  const { identity } = useCv();

  return (
    <section id="intro">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <h4
          style={{
            ...display('clamp(36px, 5.2vw, 73px)', 0.94, '-0.025em'),
            textWrap: 'balance',
          }}
        >
          {identity.headline}
        </h4>

        <p
          style={{
            margin: 0,
            /* 68ch, not the design's 52: the lede is the one paragraph anyone
               reads in full, and 52ch broke it into a narrow ribbon beside a
               much wider headline. This sits in the 65-75ch reading measure. */
            maxWidth: '68ch',
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
