'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Button } from '@ds/components/core/Button.jsx';
import { Modal } from '@ds/components/overlay/Modal.jsx';
import { SegmentedControl } from '@ds/components/navigation/SegmentedControl.jsx';

import { PROJECT_DIAGRAMS } from '@/components/diagrams';
import { ProjectTags } from '@/components/ProjectTags';
import type { Project } from '@/content/cv';
import { useI18n } from '@/i18n/client';
import { display, mono } from '@/lib/type';

type Tab = 'overview' | 'architecture';

const TABS: readonly Tab[] = ['overview', 'architecture'];

export function CaseStudyModal({
  project,
  onClose,
}: Readonly<{ project: Project | null; onClose: () => void }>) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('overview');

  // Every open starts on Overview, including reopening the same project.
  // Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevProject, setPrevProject] = useState(project);
  if (project !== prevProject) {
    setPrevProject(project);
    if (project) setTab('overview');
  }

  if (!project) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      closeLabel={t('modal.close')}
      style={{ padding: 40 }}
      title={
        <span style={display('clamp(34px, 5vw, 52px)', 1, '-0.025em')}>{project.name}</span>
      }
      description={
        <span style={{ display: 'grid', gap: 'var(--ds-space-4)', justifyItems: 'start' }}>
          <ProjectTags project={project} />
          <span
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: 'var(--ds-color-fg-muted)',
              maxWidth: '56ch',
            }}
          >
            {project.tagline}
          </span>
          {/* Opens in a new tab: this is the one control that sends a reader
              off the CV, and a repo they cannot get back from is a lost visit.
              `noopener` because `target="_blank"` otherwise hands the opened
              page a reference to this one. The glyph is decorative — the URL
              is already the accessible name. */}
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--cv-font-mono)', fontSize: 12 }}
            >
              {project.url.replace(/^https?:\/\//, '')}
              <span aria-hidden="true"> ↗</span>
            </a>
          ) : null}
        </span>
      }
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('modal.close')}
        </Button>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--ds-space-8)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            borderTop: '1px solid var(--ds-color-border)',
            paddingTop: 'var(--ds-space-5)',
          }}
        >
          <SegmentedControl
            options={TABS.map((value) => ({ value, label: t(`modal.${value}`) }))}
            value={tab}
            onChange={(value: string) => setTab(value as Tab)}
            ariaLabel={t('modal.caseStudy')}
          />
        </div>

        {tab === 'overview' ? <OverviewTab project={project} /> : null}
        {tab === 'architecture' ? <ArchitectureTab project={project} /> : null}
      </div>
    </Modal>
  );
}

function SubLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span style={mono(11, '0.14em')}>{children}</span>;
}

function OverviewTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useI18n();

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-8)' }}>
      {/* No placeholder when a project has no screenshot: an empty grey frame
          with the project name in it is 260px that tells the reader nothing. */}
      {project.screenshot ? (
        <Image
          src={project.screenshot}
          alt={`${project.name} screenshot`}
          width={860}
          height={260}
          style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 6 }}
        />
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ds-space-8)',
        }}
      >
        <div style={{ display: 'grid', gap: 'var(--ds-space-2)', alignContent: 'start' }}>
          <SubLabel>{t('modal.problem')}</SubLabel>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ds-text-base)',
              lineHeight: 1.65,
              color: 'var(--ds-color-fg)',
            }}
          >
            {project.problem}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 'var(--ds-space-2)', alignContent: 'start' }}>
          <SubLabel>{t('modal.approach')}</SubLabel>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ds-text-base)',
              lineHeight: 1.65,
              color: 'var(--ds-color-fg-muted)',
            }}
          >
            {project.approach}
          </p>
        </div>
      </div>
    </div>
  );
}

function ArchitectureTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useI18n();
  const Diagram = PROJECT_DIAGRAMS[project.id];

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-8)' }}>
      {Diagram ? <Diagram /> : null}

      <div>
        {project.pieces.map((piece) => (
          <div
            key={piece.step}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px minmax(0, 1fr)',
              gap: 'var(--ds-space-4)',
              padding: '20px 0',
              borderTop: '1px solid var(--ds-color-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--cv-font-mono)',
                fontSize: 12,
                color: 'var(--ds-color-accent)',
              }}
            >
              {piece.step}
            </span>
            <div style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
              <span style={display(22, 1.15, '-0.015em')}>{piece.title}</span>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--ds-text-sm)',
                  lineHeight: 1.65,
                  color: 'var(--ds-color-fg-muted)',
                }}
              >
                {piece.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <DashList label={t('modal.decisions')} items={project.decisions} />
    </div>
  );
}

/** The em-dash list used for a project's decisions. */
function DashList({ label, items }: Readonly<{ label: string; items: string[] }>) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-3)' }}>
      <SubLabel>{label}</SubLabel>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {items.map((item) => (
          <li
            key={item}
            style={{
              display: 'grid',
              gridTemplateColumns: '16px minmax(0, 1fr)',
              fontSize: 'var(--ds-text-sm)',
              lineHeight: 1.6,
              color: 'var(--ds-color-fg-muted)',
              maxWidth: '74ch',
            }}
          >
            <span aria-hidden="true" style={{ color: 'var(--ds-color-fg-faint)' }}>
              —
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
