'use client';

import { SectionHeader } from '@/components/SectionHeader';
import { education } from '@/content/cv';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n/client';
import { display, monoPlain } from '@/lib/type';

export function Education() {
  const { t } = useI18n();

  return (
    <Reveal id="education">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader num="04" kicker={t('sections.education.kicker')} />

        <div>
          {education.map((entry) => (
            <div
              key={entry.degree}
              style={{
                display: 'grid',
                gridTemplateColumns: '168px minmax(0, 1fr)',
                gap: 'var(--ds-space-8)',
                padding: '24px 0',
                borderBottom: '1px solid var(--ds-color-border)',
              }}
            >
              <span style={{ ...monoPlain(12, 'var(--ds-color-fg)'), alignSelf: 'start' }}>
                {entry.period}
              </span>

              <div style={{ display: 'grid', gap: 'var(--ds-space-2)', minWidth: 0 }}>
                <span style={display(26, 1.1, '-0.02em')}>{entry.degree}</span>
                <span
                  style={{
                    fontSize: 'var(--ds-text-sm)',
                    fontWeight: 'var(--ds-weight-semibold)' as never,
                    color: 'var(--ds-color-accent)',
                  }}
                >
                  {entry.school}
                </span>
                {entry.detail ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--ds-text-sm)',
                      lineHeight: 1.6,
                      color: 'var(--ds-color-fg-muted)',
                      maxWidth: '66ch',
                    }}
                  >
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
