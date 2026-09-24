import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STATE = Symbol.for('cv.observability.app-metrics');

async function graph() {
  vi.resetModules();
  const metrics = await import('./app-metrics');
  const { registry } = await import('./metrics.registry');
  return { ...metrics, registry };
}

describe('app metrics', () => {
  beforeEach(() => {
    delete (globalThis as Record<symbol, unknown>)[STATE];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reach /metrics from whichever module graph recorded them', async () => {
    const page = await graph();
    page.recordMessageSource('local');
    page.recordFlagState('cv-ask', true);
    page.recordContactSubmission('queued');

    const text = await (await graph()).registry.metrics();

    expect(text).toContain('cv_i18n_messages_total{source="local"} 1');
    expect(text).toContain('cv_feature_flag_enabled{flag="cv-ask"} 1');
    expect(text).toContain('cv_contact_submissions_total{outcome="queued"} 1');
  });

  it('reports every contact outcome from the first scrape, so rate() sees the first one', async () => {
    const text = await (await graph()).registry.metrics();

    for (const outcome of ['queued', 'rejected', 'failed']) {
      expect(text).toContain(`cv_contact_submissions_total{outcome="${outcome}"} 0`);
    }
  });

  it('reports every message source from the first scrape, so increase() sees the first load', async () => {
    const text = await (await graph()).registry.metrics();

    for (const source of ['merged', 'remote', 'local', 'default_locale']) {
      expect(text).toContain(`cv_i18n_messages_total{source="${source}"} 0`);
    }
  });

  it('counts repeated loads and follows a flag that turns off', async () => {
    const metrics = await graph();
    metrics.recordMessageSource('remote');
    metrics.recordMessageSource('remote');
    metrics.recordFlagState('cv-pdf-download', true);
    metrics.recordFlagState('cv-pdf-download', false);

    const text = await metrics.registry.metrics();

    expect(text).toContain('cv_i18n_messages_total{source="remote"} 2');
    expect(text).toContain('cv_feature_flag_enabled{flag="cv-pdf-download"} 0');
  });

  it('exports the release the process runs as service_build_info', async () => {
    vi.stubEnv('NEXT_PUBLIC_RELEASE', 'v0.12.1');

    expect(await (await graph()).registry.metrics()).toContain(
      'service_build_info{version="v0.12.1"} 1'
    );
  });
});
