'use client';

import { Badge } from 'design-system/components/feedback/Badge.jsx';

import type { Project, ProjectKind, ProjectStatus } from '@/content/cv';
import { useCv } from '@/content/useCv';

/**
 * The kind and status badges, shared by the project list and the case study so
 * the two cannot drift apart.
 *
 * `info` is deliberately unused: its hue is 240 against the accent's 264, and
 * two blues sitting next to each other read as one smudge rather than two
 * facts. A proof of concept is neutral instead — it is early, not a warning.
 *
 * Core projects carry no status, so a core badge and a proof-of-concept badge
 * never appear on the same row despite sharing the neutral variant.
 */
// `as const satisfies` rather than an annotation: the annotation would widen
// these to `string`, which the Badge's literal variant union rejects, while
// `satisfies` still checks that every kind and status is covered.
const KIND_VARIANT = {
  product: 'accent',
  core: 'neutral',
} as const satisfies Record<ProjectKind, string>;

const STATUS_VARIANT = {
  production: 'success',
  development: 'warning',
  poc: 'neutral',
} as const satisfies Record<ProjectStatus, string>;

export function ProjectTags({ project }: Readonly<{ project: Project }>) {
  const { labels } = useCv();

  return (
    <span
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--ds-space-2)',
      }}
    >
      <Badge variant={KIND_VARIANT[project.kind]}>{labels.projectKinds[project.kind]}</Badge>
      {project.status ? (
        // The dot reads as a live indicator, so only what is actually live gets one.
        <Badge variant={STATUS_VARIANT[project.status]} dot={project.status === 'production'}>
          {labels.projectStatuses[project.status]}
        </Badge>
      ) : null}
    </span>
  );
}
