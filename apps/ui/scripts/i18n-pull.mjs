import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const apiUrl = process.env.TOLGEE_API_URL;
const apiKey = process.env.TOLGEE_API_KEY;
const projectId = process.env.TOLGEE_PROJECT_ID;

if (!apiUrl || !apiKey || !projectId) {
  console.error('Missing Tolgee env vars: TOLGEE_API_URL, TOLGEE_PROJECT_ID, TOLGEE_API_KEY.');
  process.exit(1);
}

const exportUrl = new URL(`/v2/projects/${projectId}/export`, apiUrl);
exportUrl.searchParams.set('format', 'JSON');
exportUrl.searchParams.set('structure', 'KEYS');
exportUrl.searchParams.set('zip', 'true');
/*
 * Tolgee has no array type: pushing `bullets: [...]` stores three keys named
 * `bullets[0]`, `bullets[1]`, `bullets[2]`, and without this the export hands
 * them back under those literal names. The app reads `bullets` as an array, so
 * it would find nothing — and because the pull merges rather than overwrites,
 * the bracket keys pile up beside the real ones instead of failing loudly.
 * `supportArrays` makes the export reassemble them.
 */
exportUrl.searchParams.set('supportArrays', 'true');

const response = await fetch(exportUrl.toString(), {
  headers: {
    'X-API-Key': apiKey,
  },
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Tolgee export failed: ${response.status} ${response.statusText}`);
  console.error(body.slice(0, 500));
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
const zip = await JSZip.loadAsync(buffer);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '..', 'messages');
await mkdir(outDir, { recursive: true });

/*
 * Tolgee names exports with whatever language tag the project uses, which is
 * not necessarily what the app loads: a project tagged `es-ES` would land as
 * `es-ES.json`, a file `src/i18n/config.ts` never imports, silently leaving
 * Spanish stale after every pull. Normalise the region subtag away and drop
 * anything outside the supported set, so the pull can only ever write files
 * the app actually reads.
 */
const SUPPORTED = new Set(['en', 'es']);

function normalizeLocale(tag) {
  return tag.trim().toLowerCase().split(/[-_]/)[0];
}

/**
 * Deep-merges the export over what is already committed, rather than replacing
 * the file.
 *
 * A plain overwrite silently deletes every key Tolgee does not know about yet —
 * which is exactly what happens to a key added in code before anyone has pushed
 * it. That has cost this repo its entire CV content once already. Merging makes
 * a pull additive: Tolgee wins wherever it has an opinion, and local-only keys
 * survive until they are pushed.
 *
 * The trade-off is deliberate: a key deliberately deleted in Tolgee will linger
 * locally until it is removed here too. Stale keys are cheap; lost copy is not.
 */
function mergeMessages(local, remote) {
  if (Array.isArray(remote) || typeof remote !== 'object' || remote === null) return remote;
  if (Array.isArray(local) || typeof local !== 'object' || local === null) return remote;
  const merged = { ...local };
  for (const [key, value] of Object.entries(remote)) {
    merged[key] = key in local ? mergeMessages(local[key], value) : value;
  }
  return merged;
}

/**
 * Writes every object with its keys sorted.
 *
 * Tolgee's export orders keys alphabetically while these files are authored in
 * reading order, so without this every pull rewrites half the file with a diff
 * that changes nothing. Sorting on write makes the committed form stable and a
 * real content change visible.
 *
 * Safe because nothing reads these by key order: `resolveCv` indexes jobs,
 * projects and skills explicitly, education already sorts its keys, and
 * languages is an array, whose order this preserves.
 */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
}

async function readLocal(dest) {
  try {
    return JSON.parse(await readFile(dest, 'utf8'));
  } catch {
    return null; // first pull, or an unreadable file: treat the export as authoritative
  }
}

const skipped = [];
const writes = [];
zip.forEach((relativePath, file) => {
  if (!relativePath.endsWith('.json')) return;
  const filename = path.basename(relativePath);
  const locale = normalizeLocale(filename.replace(/\.json$/i, ''));
  if (!SUPPORTED.has(locale)) {
    skipped.push(filename);
    return;
  }
  const dest = path.join(outDir, `${locale}.json`);
  const task = file.async('string').then(async (content) => {
    const remote = JSON.parse(content);
    const local = await readLocal(dest);
    const merged = local ? mergeMessages(local, remote) : remote;
    return writeFile(dest, JSON.stringify(sortKeys(merged), null, 2) + '\n', 'utf8');
  });
  writes.push(task);
});

if (!writes.length) {
  console.error('Tolgee export zip contained no JSON files.');
  process.exit(1);
}

await Promise.all(writes);
console.log(`Updated translations in ${outDir}`);
if (skipped.length) {
  console.warn(`Skipped unsupported locales from Tolgee: ${skipped.join(', ')}`);
}

const missing = [...SUPPORTED].filter(
  (locale) => !zip.file(new RegExp(`(^|/)${locale}(-[A-Za-z]+)?\\.json$`, 'i')).length
);
if (missing.length) {
  console.warn(
    `Tolgee has no export for: ${missing.join(', ')} — add the language to the project, ` +
      'or those locales will fall back to whatever is committed.'
  );
}
