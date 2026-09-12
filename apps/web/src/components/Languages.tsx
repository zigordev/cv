'use client';

import { Reveal } from '@/components/Reveal';
import { SectionHeader } from '@/components/SectionHeader';
import { useCv } from '@/content/useCv';
import { monoPlain } from '@/lib/type';

/**
 * Its own section rather than a chip in the intro meta row: "EN · ES" says
 * which languages exist but not how well they are spoken, and a dedicated
 * section is also what CV parsers expect to find under that heading.
 */
export function Languages() {
  const { languages, labels } = useCv();

  return (
    <Reveal id="languages">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader kicker={labels.sections.languages} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '20px 32px',
          }}
        >
          {languages.map((language) => (
            <div key={language.name} style={{ display: 'grid', gap: 4 }}>
              <span
                style={{
                  fontSize: 'var(--ds-text-base)',
                  fontWeight: 'var(--ds-weight-medium)' as never,
                }}
              >
                {language.name}
              </span>
              <span style={monoPlain(12, 'var(--ds-color-accent)')}>{language.level}</span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
