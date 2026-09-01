'use client';

import { mono } from '@/lib/type';

/** The kicker that opens every section. */
export function SectionHeader({ kicker }: Readonly<{ kicker: string }>) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--ds-space-2)',
        paddingBottom: 'var(--ds-space-4)',
        borderBottom: '1px solid var(--ds-color-border-strong)',
      }}
    >
      <span style={mono(11, '0.16em')}>{kicker}</span>
    </div>
  );
}
