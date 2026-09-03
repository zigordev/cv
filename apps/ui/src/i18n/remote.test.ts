import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadRemoteMessages } from './remote';

/**
 * The fallback behaviour the rest of the app leans on.
 *
 * `/health` reports `components: {}` and stays `ok` even when Tolgee is
 * unreachable, and the justification written into that route is precisely that
 * a failed fetch falls back to the committed messages rather than failing the
 * page. That claim is only true while `loadRemoteMessages` returns `null`
 * instead of throwing — which is what these assert.
 */
describe('loadRemoteMessages', () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Each test owns the module-level cache, which lives on globalThis.
    delete (globalThis as Record<string, unknown>).__tolgeeMessagesCache;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it('returns null when Tolgee is not configured, without calling fetch', async () => {
    delete process.env.TOLGEE_API_URL;
    delete process.env.TOLGEE_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(loadRemoteMessages('en')).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back rather than throwing when the fetch rejects', async () => {
    process.env.TOLGEE_API_URL = 'http://tolgee.invalid';
    process.env.TOLGEE_API_KEY = 'test-key';
    process.env.TOLGEE_PROJECT_ID = '1';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'));

    await expect(loadRemoteMessages('en')).resolves.toBeNull();
  });

  it('falls back rather than throwing when Tolgee answers with an error status', async () => {
    process.env.TOLGEE_API_URL = 'http://tolgee.invalid';
    process.env.TOLGEE_API_KEY = 'test-key';
    process.env.TOLGEE_PROJECT_ID = '1';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 }) as Response,
    );

    await expect(loadRemoteMessages('en')).resolves.toBeNull();
  });
});
