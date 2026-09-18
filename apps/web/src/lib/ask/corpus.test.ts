import { describe, expect, it } from 'vitest';

import { resolveCv } from '@/content/cv';
import type { Messages } from '@/i18n/translator';

import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

import { buildCorpus } from './corpus';
import { containsContactDetail } from './guard';

const bundles = { en: en as unknown as Messages, es: es as unknown as Messages };

describe('buildCorpus', () => {
  it('pairs every content block with a place on the page', () => {
    const corpus = buildCorpus(bundles.en, 'en');
    const cv = resolveCv(bundles.en);

    expect(corpus.blocks).toHaveLength(
      1 + cv.jobs.length + cv.skillGroups.length + cv.projects.length * 4 + 2
    );
    expect(corpus.sources).toHaveLength(corpus.blocks.length);
    for (const block of corpus.blocks) expect(block.text.trim()).not.toBe('');
    for (const source of corpus.sources) expect(source.label.trim()).not.toBe('');
  });

  it('gives both locales the same shape, so an index means the same place in either', () => {
    const english = buildCorpus(bundles.en, 'en');
    const spanish = buildCorpus(bundles.es, 'es');

    expect(spanish.sources.map((source) => source.target)).toEqual(
      english.sources.map((source) => source.target)
    );
    expect(spanish.context).toContain('Spanish (es)');
    expect(english.context).toContain('English (en)');
  });

  it('points each part of a case study at the tab that shows it', () => {
    const corpus = buildCorpus(bundles.en, 'en');
    const gpool = corpus.sources.filter(
      (source) => source.target.type === 'project' && source.target.id === 'gpool'
    );

    expect(gpool.map((source) => source.target)).toEqual([
      { type: 'project', id: 'gpool', tab: 'overview' },
      { type: 'project', id: 'gpool', tab: 'architecture' },
      { type: 'project', id: 'gpool', tab: 'architecture' },
      { type: 'project', id: 'gpool', tab: 'pipelines' },
    ]);
  });

  it('carries the facts that live only in code', () => {
    const corpus = buildCorpus(bundles.en, 'en');
    const overview =
      corpus.blocks[
        corpus.sources.findIndex(
          (source) =>
            source.target.type === 'project' &&
            source.target.id === 'gpool' &&
            source.target.tab === 'overview'
        )
      ];

    expect(overview.text).toContain('https://gpool.zigordev.com');
    expect(overview.text).toContain('NestJS');
  });

  it('is identical across builds, so the cached prefix stays warm', () => {
    expect(JSON.stringify(buildCorpus(bundles.es, 'es'))).toBe(
      JSON.stringify(buildCorpus(bundles.es, 'es'))
    );
  });

  it.each(['en', 'es'] as const)('holds nothing shaped like a contact detail in %s', (locale) => {
    const corpus = buildCorpus(bundles[locale], locale);
    const flagged = corpus.blocks.filter((block) => containsContactDetail(block.text));

    expect(flagged).toEqual([]);
  });
});
