import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyExport, exportUrl, pullTranslations } from './i18n-pull.mjs';

async function zipOf(files) {
  const zip = new JSZip();
  for (const [name, contents] of Object.entries(files)) {
    zip.file(name, JSON.stringify(contents));
  }
  return JSZip.loadAsync(await zip.generateAsync({ type: 'nodebuffer' }));
}

describe('i18n pull', () => {
  let outDir;

  beforeEach(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'cv-i18n-'));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  const read = async (locale) =>
    JSON.parse(await readFile(path.join(outDir, `${locale}.json`), 'utf8'));

  it('asks Tolgee for the nested export the message files are written in', () => {
    const url = exportUrl('http://tolgee.invalid', '1');

    expect(url.searchParams.get('structureDelimiter')).toBe('.');
    expect(url.searchParams.get('supportArrays')).toBe('true');
    expect(url.searchParams.get('structure')).toBeNull();
    expect(url.pathname).toBe('/v2/projects/1/export');
  });

  it('refuses a flat export instead of committing dotted keys', async () => {
    const committed = { cv: { identity: { title: 'Engineer' } } };
    await writeFile(path.join(outDir, 'en.json'), JSON.stringify(committed), 'utf8');

    await expect(
      applyExport(await zipOf({ 'en.json': { 'cv.identity.title': 'Ingeniero' } }), outDir)
    ).rejects.toThrow(/dotted keys/);

    expect(await read('en')).toEqual(committed);
  });

  it('refuses an export whose lists arrived as bracket keys', async () => {
    await expect(
      applyExport(await zipOf({ 'en.json': { 'cv.skills[0]': 'TypeScript' } }), outDir)
    ).rejects.toThrow(/dotted keys/);

    await expect(read('en')).rejects.toThrow();
  });

  it('writes nothing for any locale when one export is flat', async () => {
    await expect(
      applyExport(
        await zipOf({
          'en.json': { cv: { identity: { title: 'Engineer' } } },
          'es.json': { 'cv.identity.title': 'Ingeniero' },
        }),
        outDir
      )
    ).rejects.toThrow(/dotted keys/);

    await expect(read('en')).rejects.toThrow();
    await expect(read('es')).rejects.toThrow();
  });

  it('merges the export over committed copy instead of replacing it', async () => {
    await writeFile(
      path.join(outDir, 'es.json'),
      JSON.stringify({ cv: { identity: { title: 'Ingeniero', city: 'Madrid' } } }),
      'utf8'
    );

    await applyExport(
      await zipOf({ 'es.json': { cv: { identity: { title: 'Ingeniera' } } } }),
      outDir
    );

    expect(await read('es')).toEqual({ cv: { identity: { city: 'Madrid', title: 'Ingeniera' } } });
  });

  it('keeps the committed list when the export has a different number of entries', async () => {
    await writeFile(
      path.join(outDir, 'en.json'),
      JSON.stringify({ cv: { skills: ['TypeScript', 'Rust', 'Go'] } }),
      'utf8'
    );

    const result = await applyExport(
      await zipOf({ 'en.json': { cv: { skills: ['TypeScript'] } } }),
      outDir
    );

    expect(await read('en')).toEqual({ cv: { skills: ['TypeScript', 'Rust', 'Go'] } });
    expect(result.keptLists).toEqual(['cv.skills (3 committed, 1 exported)']);
  });

  it('writes a region subtag onto the file the app reads', async () => {
    await applyExport(
      await zipOf({ 'es-ES.json': { cv: { identity: { city: 'Madrid' } } } }),
      outDir
    );

    expect(await read('es')).toEqual({ cv: { identity: { city: 'Madrid' } } });
  });

  it('skips locales the app does not support, and names them', async () => {
    const result = await applyExport(
      await zipOf({
        'en.json': { cv: { identity: { city: 'Madrid' } } },
        'fr.json': { cv: { identity: { city: 'Paris' } } },
      }),
      outDir
    );

    expect(result.skipped).toEqual(['fr.json']);
    await expect(read('fr')).rejects.toThrow();
  });

  it('names every supported locale Tolgee exported nothing for', async () => {
    const result = await applyExport(
      await zipOf({ 'es.json': { cv: { identity: { city: 'Madrid' } } } }),
      outDir
    );

    expect(result.missing).toEqual(['en']);
  });

  it('sorts keys on write, so a pull with no new copy is an empty diff', async () => {
    await applyExport(await zipOf({ 'en.json': { nav: { pdf: 'PDF', ask: 'Ask' } } }), outDir);

    expect(await readFile(path.join(outDir, 'en.json'), 'utf8')).toBe(
      `${JSON.stringify({ nav: { ask: 'Ask', pdf: 'PDF' } }, null, 2)}\n`
    );
  });

  it('writes nothing when a committed file cannot be parsed', async () => {
    const conflicted = '<<<<<<< HEAD\n{}\n';
    await writeFile(path.join(outDir, 'es.json'), conflicted, 'utf8');

    await expect(
      applyExport(
        await zipOf({
          'en.json': { cv: { identity: { city: 'Madrid' } } },
          'es.json': { cv: { identity: { city: 'Madrid' } } },
        }),
        outDir
      )
    ).rejects.toThrow(/is not valid JSON/);

    expect(await readFile(path.join(outDir, 'es.json'), 'utf8')).toBe(conflicted);
    await expect(read('en')).rejects.toThrow();
  });

  it('refuses an export that carries no JSON at all', async () => {
    const zip = new JSZip();
    zip.file('README.txt', 'nothing here');

    await expect(
      applyExport(await JSZip.loadAsync(await zip.generateAsync({ type: 'nodebuffer' })), outDir)
    ).rejects.toThrow(/no JSON files/);
  });

  it('stops before fetching when Tolgee is not configured', async () => {
    await expect(pullTranslations({ env: {}, outDir })).rejects.toThrow(/Missing Tolgee env vars/);
  });
});
