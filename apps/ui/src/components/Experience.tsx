'use client';

import { SectionHeader } from '@/components/SectionHeader';
import { jobs } from '@/content/cv';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n/client';
import { display, monoPlain } from '@/lib/type';

export function Experience() {
  const { t } = useI18n();

  return (
    <Reveal id="experience">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader num="02" kicker={t('sections.experience.kicker')} />

        <div>
          {jobs.map((job) => (
            <div
              key={`${job.company}-${job.period}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '168px minmax(0, 1fr)',
                gap: 'var(--ds-space-8)',
                padding: '32px 0',
                borderBottom: '1px solid var(--ds-color-border)',
              }}
            >
              <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                <span style={monoPlain(12, 'var(--ds-color-fg)')}>{job.period}</span>
                <span style={monoPlain(12)}>{job.location}</span>
              </div>

              <div style={{ display: 'grid', gap: 'var(--ds-space-3)', minWidth: 0 }}>
                <span style={display(28, 1.1, '-0.02em')}>{job.company}</span>
                <span
                  style={{
                    fontSize: 'var(--ds-text-sm)',
                    fontWeight: 'var(--ds-weight-semibold)' as never,
                    color: 'var(--ds-color-accent)',
                  }}
                >
                  {job.role}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--ds-text-base)',
                    lineHeight: 1.6,
                    color: 'var(--ds-color-fg-muted)',
                    maxWidth: '64ch',
                  }}
                >
                  {job.summary}
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {job.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '16px minmax(0, 1fr)',
                        fontSize: 'var(--ds-text-sm)',
                        lineHeight: 1.6,
                        maxWidth: '74ch',
                      }}
                    >
                      <span aria-hidden="true" style={{ color: 'var(--ds-color-fg-faint)' }}>
                        —
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
