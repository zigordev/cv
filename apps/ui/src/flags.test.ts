import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('cv-pdf-download', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UNLEASH_URL;
    delete process.env.UNLEASH_TOKEN;
    delete process.env.FLAG_CV_PDF_DOWNLOAD;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('shows the button when no flag server is configured', async () => {
    const { pdfDownloadEnabled } = await import('./flags');
    await expect(pdfDownloadEnabled()).resolves.toBe(true);
  });

  it('still shows the button when a server is configured but unreachable', async () => {
    process.env.UNLEASH_URL = 'http://127.0.0.1:1';
    process.env.UNLEASH_TOKEN = 'unreachable';

    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(true);
  });

  it('honours the environment override when there is no server to ask', async () => {
    process.env.FLAG_CV_PDF_DOWNLOAD = 'false';

    const { pdfDownloadEnabled } = await import('./flags');

    await expect(pdfDownloadEnabled()).resolves.toBe(false);
  });
});
