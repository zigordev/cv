'use client';

import { useState } from 'react';

import { CaseStudyModal } from '@/components/CaseStudyModal';
import { SectionHeader } from '@/components/SectionHeader';
import { projects, type Project } from '@/content/cv';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n/client';
import { display, mono, monoPlain } from '@/lib/type';

export function Projects() {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  const active = projects.find((p) => p.id === openId) ?? null;

  return (
    <Reveal id="projects">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader num="01" kicker={t('sections.projects.kicker')} />

        <div>
          {projects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              num={String(index + 1).padStart(2, '0')}
              onOpen={() => setOpenId(project.id)}
            />
          ))}
        </div>
      </div>

      <CaseStudyModal project={active} onClose={() => setOpenId(null)} />
    </Reveal>
  );
}

/**
 * The whole row is the click target. The design's prototype used a div; here
 * it is a real <button> so it lands in the tab order and answers Enter/Space,
 * with `text-align: left` undoing the button default.
 */
function ProjectRow({
  project,
  num,
  onOpen,
}: Readonly<{ project: Project; num: string; onOpen: () => void }>) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="cv-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '52px minmax(0, 1fr) 96px 32px',
        gap: 'var(--ds-space-5)',
        alignItems: 'start',
        width: '100%',
        padding: '24px 16px 24px 0',
        border: 'none',
        borderBottom: '1px solid var(--ds-color-border)',
        borderRadius: 0,
        background: 'transparent',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span style={{ ...monoPlain(12, 'var(--ds-color-fg-faint)'), paddingTop: 10 }}>{num}</span>

      <span style={{ display: 'grid', gap: 'var(--ds-space-2)', minWidth: 0 }}>
        <span className="cv-row-name" style={display('clamp(26px, 3vw, 36px)', 1.05, '-0.02em')}>
          {project.name}
        </span>
        <span
          style={{
            fontSize: 'var(--ds-text-base)',
            lineHeight: 1.55,
            color: 'var(--ds-color-fg-muted)',
            maxWidth: '58ch',
          }}
        >
          {project.tagline}
        </span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-4)' }}>
          {project.stack.map((item) => (
            <span key={item} style={mono(11, '0.06em')}>
              {item}
            </span>
          ))}
        </span>
      </span>

      <span style={{ ...monoPlain(12), paddingTop: 10 }}>{project.year}</span>

      <span
        aria-hidden="true"
        className="cv-row-arrow"
        style={{
          fontSize: 20,
          color: 'var(--ds-color-accent)',
          opacity: 0.45,
          paddingTop: 6,
        }}
      >
        →
      </span>
    </button>
  );
}
