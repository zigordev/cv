'use client';

import Image from 'next/image';

import { useCv } from '@/content/useCv';
import { mono, monoPlain } from '@/lib/type';

/** Order mirrors the page, and the page mirrors the PDF. */
const SECTION_KEYS = [
  { key: 'experience', href: '#experience' },
  { key: 'skills', href: '#skills' },
  { key: 'projects', href: '#projects' },
  { key: 'education', href: '#education' },
  { key: 'languages', href: '#languages' },
] as const;

export function Rail() {
  const { identity, portrait, labels } = useCv();

  return (
    <aside
      className="cv-rail"
      style={{
        position: 'sticky',
        top: 'var(--cv-content-top)',
        alignSelf: 'start',
        display: 'grid',
        gap: 'var(--ds-space-5)',
        alignContent: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
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

      {/* Role and location sit here rather than above the headline: they are
          identifying facts, not an opening line, and the rail is where a reader
          already looks for who this is. Two lines because 208px will not hold
          "INGENIERO DE SOFTWARE · BILBAO, ESPAÑA" on one. */}
      <div style={{ display: 'grid', gap: 'var(--ds-space-1)' }}>
        <span style={mono(11, '0.16em', 'var(--ds-color-accent)')}>{identity.title}</span>
        <span style={mono(11, '0.16em')}>{identity.location}</span>
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
              alignItems: 'baseline',
              gap: 'var(--ds-space-2)',
              padding: '6px 0',
              textDecoration: 'none',
              borderTop: '1px solid var(--ds-color-border)',
            }}
          >
            <span>{labels.sections[section.key]}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
