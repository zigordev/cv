'use client';

import { SectionHeader } from '@/components/SectionHeader';
import { skillGroups } from '@/content/cv';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n/client';
import { mono } from '@/lib/type';

export function Skills() {
  const { t } = useI18n();

  return (
    <Reveal id="skills">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader num="03" kicker={t('sections.skills.kicker')} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '40px 32px',
          }}
        >
          {skillGroups.map((group) => (
            <div key={group.group} style={{ display: 'grid', gap: 'var(--ds-space-3)' }}>
              <span style={mono(11, '0.14em')}>{group.group}</span>
              <span
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-color-fg-subtle)',
                  lineHeight: 1.5,
                }}
              >
                {group.note}
              </span>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gap: 6,
                }}
              >
                {group.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 'var(--ds-text-base)',
                      fontWeight: 'var(--ds-weight-medium)' as never,
                      color: 'var(--ds-color-fg)',
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
