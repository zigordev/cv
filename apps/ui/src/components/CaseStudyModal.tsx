'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { Badge } from '@ds/components/feedback/Badge.jsx';
import { Button } from '@ds/components/core/Button.jsx';
import { Modal } from '@ds/components/overlay/Modal.jsx';
import { SegmentedControl } from '@ds/components/navigation/SegmentedControl.jsx';
import { StatTile } from '@ds/components/data-display/StatTile.jsx';

import type { Project } from '@/content/cv';
import { useI18n } from '@/i18n/client';
import { display, mono } from '@/lib/type';

type Tab = 'overview' | 'architecture' | 'results';

const TABS: readonly Tab[] = ['overview', 'architecture', 'results'];

export function CaseStudyModal({
  project,
  onClose,
}: Readonly<{ project: Project | null; onClose: () => void }>) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('overview');

  // Every open starts on Overview, including reopening the same project.
  useEffect(() => {
    if (project) setTab('overview');
  }, [project]);

  if (!project) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      closeLabel={t('modal.close')}
      style={{ padding: 40 }}
      title={
        <span style={{ display: 'grid', gap: 'var(--ds-space-3)' }}>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-5)' }}>
            <span style={mono(11, '0.14em', 'var(--ds-color-accent)')}>{t('modal.caseStudy')}</span>
            <span style={mono(11, '0.14em')}>{project.year}</span>
            <span style={mono(11, '0.14em')}>{project.role}</span>
          </span>
          <span style={display('clamp(34px, 5vw, 52px)', 1, '-0.025em')}>{project.name}</span>
        </span>
      }
      description={
        <span
          style={{
            display: 'block',
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--ds-color-fg-muted)',
            maxWidth: '56ch',
          }}
        >
          {project.tagline}
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
            flexWrap: 'wrap',
            gap: 'var(--ds-space-4)',
            alignItems: 'center',
            justifyContent: 'space-between',
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-2)' }}>
            {project.stack.map((item) => (
              <Badge key={item} variant="neutral">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {tab === 'overview' ? <OverviewTab project={project} /> : null}
        {tab === 'architecture' ? <ArchitectureTab project={project} /> : null}
        {tab === 'results' ? <ResultsTab project={project} /> : null}
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
      {project.screenshot ? (
        <Image
          src={project.screenshot}
          alt={`${project.name} screenshot`}
          width={860}
          height={260}
          style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 6 }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 260,
            borderRadius: 6,
            background: 'var(--ds-color-surface-2)',
            border: '1px solid var(--ds-color-border)',
            display: 'grid',
            placeItems: 'center',
            ...mono(11, '0.14em'),
          }}
        >
          {project.name}
        </div>
      )}

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

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-8)' }}>
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

function ResultsTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useI18n();

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-8)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {project.stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </div>

      <DashList label={t('modal.lessons')} items={project.lessons} />

      {project.links.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-5)' }}>
          {project.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontFamily: 'var(--cv-font-mono)', fontSize: 12 }}
            >
              {link.label} →
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The recurring em-dash list used for decisions and lessons. */
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
