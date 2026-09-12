import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const UNREACHABLE = 'http://127.0.0.1:1';

describe('cv-pdf-download', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UNLEASH_URL;
    delete process.env.UNLEASH_TOKEN;
    delete process.env.FLAG_CV_PDF_DOWNLOAD;
    process.env.UNLEASH_BACKUP_PATH = mkdtempSync(join(tmpdir(), 'cv-flags-'));
  });

  afterEach(async () => {
    const { disconnectRemoteFlags } = await import('@/observability');
    disconnectRemoteFlags();
    process.env = { ...saved };
  });

  it('shows the button when no flag server is configured', async () => {
    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(true);
  });

  it('falls back to the declared default when the server is unreachable and nothing is cached', async () => {
    process.env.UNLEASH_URL = UNREACHABLE;
    process.env.UNLEASH_TOKEN = 'unreachable';

    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(true);
  });

  it('keeps the last value it saw when the server is unreachable but a cache exists', async () => {
    process.env.UNLEASH_URL = UNREACHABLE;
    process.env.UNLEASH_TOKEN = 'unreachable';
    process.env.UNLEASH_APP_NAME = 'cv-web-cached';
    writeFileSync(
      join(process.env.UNLEASH_BACKUP_PATH!, 'unleash-backup-cv-web-cached.json'),
      JSON.stringify({
        version: 2,
        features: [
          {
            name: 'cv-pdf-download',
            type: 'release',
            enabled: false,
            project: 'default',
            stale: false,
            strategies: [{ name: 'default', constraints: [], parameters: {}, variants: [] }],
            variants: [],
            impressionData: false,
          },
        ],
        segments: [],
      })
    );

    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(false);
  });

  it('honours the environment override when there is no server to ask', async () => {
    process.env.FLAG_CV_PDF_DOWNLOAD = 'false';

    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(false);
  });
});
