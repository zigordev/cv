import { Counter, Gauge, Histogram } from 'prom-client';

import { registry } from '@/observability/metrics.registry';
import { startAtZero } from '@/observability/start-at-zero';

import type { MessageSpend } from './pricing';

export const ASK_OUTCOMES = [
  'answered',
  'refused',
  'incomplete',
  'rate_limited',
  'budget_exhausted',
  'upstream_error',
  'invalid',
  'disabled',
] as const;

export type AskOutcome = (typeof ASK_OUTCOMES)[number];

const TOKEN_KINDS = ['input', 'output', 'cache_read', 'cache_write'] as const;

function reuse<T>(name: string, create: () => T): T {
  return (registry.getSingleMetric(name) as T | undefined) ?? create();
}

const requests = reuse('cv_ask_requests_total', () => {
  const counter = new Counter({
    name: 'cv_ask_requests_total',
    help: 'Questions sent to the answer box, by outcome',
    labelNames: ['outcome'] as const,
    registers: [registry],
  });
  startAtZero(
    counter,
    ASK_OUTCOMES.map((outcome) => ({ outcome }))
  );
  return counter;
});

const tokens = reuse('cv_ask_tokens_total', () => {
  const counter = new Counter({
    name: 'cv_ask_tokens_total',
    help: 'Tokens billed for answer box requests, by kind',
    labelNames: ['kind'] as const,
    registers: [registry],
  });
  startAtZero(
    counter,
    TOKEN_KINDS.map((kind) => ({ kind }))
  );
  return counter;
});

const cost = reuse(
  'cv_ask_cost_usd_total',
  () =>
    new Counter({
      name: 'cv_ask_cost_usd_total',
      help: 'Estimated spend on answer box requests, in US dollars',
      registers: [registry],
    })
);

const latency = reuse(
  'cv_ask_latency_seconds',
  () =>
    new Histogram({
      name: 'cv_ask_latency_seconds',
      help: 'Time to answer a question that passed validation',
      buckets: [0.5, 1, 2, 4, 8, 15, 30],
      registers: [registry],
    })
);

const budgetUsed = reuse(
  'cv_ask_budget_used_ratio',
  () =>
    new Gauge({
      name: 'cv_ask_budget_used_ratio',
      help: 'Share of the monthly answer box budget already spent',
      registers: [registry],
    })
);

const citations = reuse(
  'cv_ask_citations',
  () =>
    new Histogram({
      name: 'cv_ask_citations',
      help: 'Distinct CV passages cited per answered question',
      buckets: [0, 1, 2, 3, 5, 8],
      registers: [registry],
    })
);

export function observeBudgetUsed(usedRatio: number): void {
  budgetUsed.set(usedRatio);
}

export function observeOutcome(
  outcome: AskOutcome,
  details: { latencySeconds?: number; citationCount?: number; budgetUsedRatio?: number } = {}
): void {
  requests.inc({ outcome });
  if (details.latencySeconds !== undefined) latency.observe(details.latencySeconds);
  if (details.budgetUsedRatio !== undefined) budgetUsed.set(details.budgetUsedRatio);
  if (outcome === 'answered' && details.citationCount !== undefined) {
    citations.observe(details.citationCount);
  }
}

export function observeSpend(spend: MessageSpend): void {
  tokens.inc({ kind: 'input' }, spend.usage.input);
  tokens.inc({ kind: 'output' }, spend.usage.output);
  tokens.inc({ kind: 'cache_read' }, spend.usage.cacheRead);
  tokens.inc({ kind: 'cache_write' }, spend.usage.cacheWrite);
  cost.inc(spend.costUsd);
}
