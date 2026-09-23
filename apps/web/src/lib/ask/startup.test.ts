import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { monthOf } from './budget';
import { EMPTY_USAGE } from './pricing';

async function budgetFile(costUsd: number): Promise<string> {
  const path = join(await mkdtemp(join(tmpdir(), 'cv-ask-budget-')), 'ask-budget.json');
  const state = { month: monthOf(new Date()), requests: 6, costUsd, tokens: EMPTY_USAGE };
  await writeFile(path, JSON.stringify(state), 'utf8');
  return path;
}

describe('ask startup', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('publishes the answer box series before the first question of the process', async () => {
    vi.resetModules();
    vi.stubEnv('ASK_BUDGET_PATH', await budgetFile(2));
    vi.stubEnv('ASK_BUDGET_LIMIT_USD', '10');

    const { logAskConfiguration } = await import('./startup');
    await logAskConfiguration();

    const { registry } = await import('@/observability/metrics.registry');
    const text = await registry.metrics();

    expect(text).toContain('cv_ask_budget_used_ratio 0.2');
    expect(text).toContain('cv_ask_requests_total{outcome="answered"} 0');
    expect(text).toContain('cv_ask_tokens_total{kind="cache_read"} 0');
    expect(text).toContain('cv_ask_cost_usd_total 0');
  });
});
