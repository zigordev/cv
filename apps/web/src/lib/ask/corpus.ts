import type { BetaTextBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { resolveCv, type Project } from '@/content/cv';
import type { Locale } from '@/i18n/config';
import { createTranslator, type Messages } from '@/i18n/translator';

import type { AskSource } from './contract';

export interface Corpus {
  readonly title: string;
  readonly context: string;
  readonly blocks: readonly BetaTextBlockParam[];
  readonly sources: readonly AskSource[];
}

const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', es: 'Spanish' };

function paragraphs(...parts: ReadonlyArray<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n');
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

export function buildCorpus(messages: Messages, locale: Locale): Corpus {
  const cv = resolveCv(messages);
  const t = createTranslator(messages);
  const { identity, labels } = cv;
  const fullName = `${identity.firstName} ${identity.lastName}`;

  const blocks: BetaTextBlockParam[] = [];
  const sources: AskSource[] = [];

  const add = (text: string, source: AskSource) => {
    blocks.push({ type: 'text', text });
    sources.push(source);
  };

  add(
    paragraphs(
      `${fullName} — ${identity.title}`,
      identity.location,
      identity.headline,
      identity.lede,
      identity.summary
    ),
    { label: labels.pdf.summary, target: { type: 'section', id: 'intro' } }
  );

  for (const job of cv.jobs) {
    add(
      paragraphs(
        `${labels.sections.experience}: ${job.company} — ${job.role}`,
        `${job.period} · ${job.location}`,
        job.summary,
        bullets(job.bullets)
      ),
      {
        label: `${labels.sections.experience} · ${job.company}`,
        target: { type: 'section', id: 'experience' },
      }
    );
  }

  for (const group of cv.skillGroups) {
    add(
      paragraphs(`${labels.sections.skills}: ${group.group}`, group.note, group.items.join(', ')),
      {
        label: `${labels.sections.skills} · ${group.group}`,
        target: { type: 'section', id: 'skills' },
      }
    );
  }

  const addProject = (project: Project) => {
    const status = project.status ? ` · ${labels.projectStatuses[project.status]}` : '';

    add(
      paragraphs(
        `${labels.sections.projects}: ${project.name}`,
        `${labels.projectKinds[project.kind]}${status}`,
        `${labels.pdf.stack}: ${project.stack.join(', ')}`,
        project.url,
        project.role,
        project.tagline,
        `${t('modal.problem')}: ${project.problem}`,
        `${t('modal.approach')}: ${project.approach}`
      ),
      {
        label: `${project.name} · ${t('modal.overview')}`,
        target: { type: 'project', id: project.id, tab: 'overview' },
      }
    );

    add(
      paragraphs(
        `${project.name} — ${t('modal.architecture')}`,
        ...project.pieces.map((piece) => `${piece.step}. ${piece.title}: ${piece.text}`)
      ),
      {
        label: `${project.name} · ${t('modal.architecture')}`,
        target: { type: 'project', id: project.id, tab: 'architecture' },
      }
    );

    add(paragraphs(`${project.name} — ${t('modal.decisions')}`, bullets(project.decisions)), {
      label: `${project.name} · ${t('modal.decisions')}`,
      target: { type: 'project', id: project.id, tab: 'architecture' },
    });

    add(
      paragraphs(
        `${project.name} — ${t('modal.pipelines')}`,
        ...project.pipeline.stages.map((stage) => `${stage.step}. ${stage.title}: ${stage.text}`),
        `${t('modal.automation')}:`,
        bullets(project.pipeline.automation)
      ),
      {
        label: `${project.name} · ${t('modal.pipelines')}`,
        target: { type: 'project', id: project.id, tab: 'pipelines' },
      }
    );
  };

  for (const project of cv.projects) addProject(project);

  add(
    paragraphs(
      labels.sections.education,
      ...cv.education.map((entry) =>
        paragraphs(`${entry.degree} — ${entry.school} (${entry.period})`, entry.detail)
      )
    ),
    { label: labels.sections.education, target: { type: 'section', id: 'education' } }
  );

  add(
    paragraphs(
      labels.sections.languages,
      cv.languages.map((language) => `${language.name}: ${language.level}`).join('\n')
    ),
    { label: labels.sections.languages, target: { type: 'section', id: 'languages' } }
  );

  return {
    title: `${fullName} · ${t('rail.cv')}`,
    context: [
      `Language of this CV: ${LANGUAGE_NAMES[locale]} (${locale}).`,
      'Each content block is one self-contained part of the CV: the summary, one role, one skill group, education, languages, or one part of a project case study (overview, architecture, decisions or pipelines).',
    ].join(' '),
    blocks,
    sources,
  };
}
