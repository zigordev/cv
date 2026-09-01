'use client';

import { useState } from 'react';

import { CaseStudyModal } from '@/components/CaseStudyModal';
import { SectionHeader } from '@/components/SectionHeader';
import type { Project } from '@/content/cv';
import { useCv } from '@/content/useCv';
import { Reveal } from '@/components/Reveal';
import { ProjectTags } from '@/components/ProjectTags';
import { display } from '@/lib/type';

export function Projects() {
  const { projects, labels } = useCv();
  const [openId, setOpenId] = useState<string | null>(null);

  const active = projects.find((p) => p.id === openId) ?? null;

  return (
    <Reveal id="projects">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <SectionHeader kicker={labels.sections.projects} />

        <div>
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
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
/**
 * The whole row opens the case study, but a live product also needs its own
 * link — and an `<a>` inside a `<button>` is invalid HTML, so the click target
 * cannot be the element that wraps the content.
 *
 * Instead the row is a plain container with an absolutely positioned button
 * covering it, and the link lifts itself above that overlay with a z-index.
 * Both stay independently focusable, and the row keeps its full-width target.
 */
function ProjectRow({ project, onOpen }: Readonly<{ project: Project; onOpen: () => void }>) {
  return (
    <div
      className="cv-row"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 32px',
        gap: 'var(--ds-space-5)',
        alignItems: 'start',
        padding: '16px 0',
        borderBottom: '1px solid var(--ds-color-border)',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="cv-row-hit"
        aria-label={project.name}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'transparent',
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
        }}
      />

      <span style={{ display: 'grid', gap: 'var(--ds-space-2)', minWidth: 0, justifyItems: 'start' }}>
        <ProjectTags project={project} />
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
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            /* Above the overlay, or the button would swallow the click. */
            style={{
              position: 'relative',
              zIndex: 1,
              fontFamily: 'var(--cv-font-mono)',
              fontSize: 12,
            }}
          >
            {project.url.replace(/^https?:\/\//, '')}
            <span aria-hidden="true"> ↗</span>
          </a>
        ) : null}
      </span>

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
    </div>
  );
}
