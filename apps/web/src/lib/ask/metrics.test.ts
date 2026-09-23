import { beforeEach, describe, expect, it, vi } from 'vitest';

async function graph() {
  vi.resetModules();
  const metrics = await import('./metrics');
  const { registry } = await import('@/observability/metrics.registry');
  return { ...metrics, registry };
}

describe('ask metrics', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reports every outcome from the first scrape, so a deploy does not read as no data', async () => {
    const metrics = await graph();

    const text = await metrics.registry.metrics();

    for (const outcome of metrics.ASK_OUTCOMES) {
      expect(text).toContain(`cv_ask_requests_total{outcome="${outcome}"} 0`);
    }
  });

  it('reports every token kind, the spend and the budget share before any question', async () => {
    const text = await (await graph()).registry.metrics();

    for (const kind of ['input', 'output', 'cache_read', 'cache_write']) {
      expect(text).toContain(`cv_ask_tokens_total{kind="${kind}"} 0`);
    }
    expect(text).toContain('cv_ask_cost_usd_total 0');
    expect(text).toContain('cv_ask_budget_used_ratio 0');
  });

  it('counts a question on top of the series it started at zero', async () => {
    const metrics = await graph();
    metrics.observeOutcome('answered', {
      latencySeconds: 2,
      citationCount: 3,
      budgetUsedRatio: 0.25,
    });

    const text = await metrics.registry.metrics();

    expect(text).toContain('cv_ask_requests_total{outcome="answered"} 1');
    expect(text).toContain('cv_ask_requests_total{outcome="refused"} 0');
    expect(text).toContain('cv_ask_budget_used_ratio 0.25');
  });

  it('publishes the budget share the process starts with', async () => {
    const metrics = await graph();
    metrics.observeBudgetUsed(0.017);

    expect(await metrics.registry.metrics()).toContain('cv_ask_budget_used_ratio 0.017');
  });

  it('adds spend to the counters it started at zero', async () => {
    const metrics = await graph();
    metrics.observeSpend({
      usage: { input: 120, output: 40, cacheRead: 900, cacheWrite: 0 },
      costUsd: 0.106,
      fallback: false,
    });

    const text = await metrics.registry.metrics();

    expect(text).toContain('cv_ask_tokens_total{kind="input"} 120');
    expect(text).toContain('cv_ask_tokens_total{kind="cache_write"} 0');
    expect(text).toContain('cv_ask_cost_usd_total 0.106');
  });
});
