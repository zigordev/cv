import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/observability/tracing', () => ({ startTracing: vi.fn() }));
vi.mock('@/observability/standard-events', () => ({
  logServiceStarted: vi.fn(),
  logServiceStopping: vi.fn(),
  observeProcessFailures: vi.fn(),
}));
vi.mock('@/lib/notifications', () => ({ startBrokerProbe: vi.fn() }));
vi.mock('@/lib/ask/startup', () => ({ logAskConfiguration: vi.fn(async () => {}) }));

describe('instrumentation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('declares the RUM vocabulary at boot, before any beacon reaches the ingest', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.resetModules();

    const { register } = await import('./instrumentation');
    await register();

    const { registry } = await import('./observability/metrics.registry');
    const { RUM_INTERACTIONS } = await import('./observability/rum-events');
    const text = await registry.metrics();

    for (const name of RUM_INTERACTIONS) {
      expect(text).toContain(`interaction_type="${name}"`);
    }
  });

  it('declares nothing on the edge runtime, where prom-client does not run', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.resetModules();

    const { register } = await import('./instrumentation');
    await register();

    const { registry } = await import('./observability/metrics.registry');

    expect(await registry.metrics()).not.toContain('interaction_type="cv-downloaded"');
  });
});
