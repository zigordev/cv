import type { Locale } from '@/i18n/config';
import { writeLogRecord, type LogLevel } from '@/observability/json-logger';

import type { BudgetState } from './budget';
import type { AskConfig } from './config';
import type { AskSource, Refusal } from './contract';
import type { AskOutcome } from './metrics';
import { EMPTY_USAGE, type MessageSpend } from './pricing';

export type { LogLevel } from '@/observability/json-logger';

export function writeLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  writeLogRecord(level, { event, ...fields });
}

export interface AskLogInput {
  readonly requestId: string;
  readonly locale: Locale;
  readonly question: string;
  readonly outcome: AskOutcome;
  readonly latencyMs: number;
  readonly budget: BudgetState;
  readonly refusal?: Refusal;
  readonly sources?: readonly AskSource[];
  readonly text?: string;
  readonly model?: string;
  readonly stopReason?: string;
  readonly spend?: MessageSpend;
  readonly error?: string;
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function sourceKey(source: AskSource): string {
  return source.target.type === 'project'
    ? `projects/${source.target.id}/${source.target.tab}`
    : source.target.id;
}

export function askCompletedFields(input: AskLogInput, config: AskConfig): Record<string, unknown> {
  const usage = input.spend?.usage ?? EMPTY_USAGE;
  const sources = input.sources ?? [];

  return {
    requestId: input.requestId,
    locale: input.locale,
    ...(config.logQuestions ? { question: input.question } : {}),
    questionChars: input.question.length,
    outcome: input.outcome,
    refusal: input.refusal ?? null,
    citations: sources.map(sourceKey),
    citationCount: sources.length,
    model: input.model ?? config.model,
    effort: config.effort,
    stopReason: input.stopReason ?? null,
    tokens: usage,
    cacheHit: usage.cacheRead > 0,
    fallback: input.spend?.fallback ?? false,
    costUsd: roundUsd(input.spend?.costUsd ?? 0),
    budget: {
      month: input.budget.month,
      monthUsd: roundUsd(input.budget.costUsd),
      limitUsd: config.budgetLimitUsd,
      usedRatio: roundUsd(input.budget.costUsd / config.budgetLimitUsd),
    },
    latencyMs: Math.round(input.latencyMs),
    ...(config.logAnswers && input.text ? { answer: input.text } : {}),
    ...(input.error ? { error: input.error } : {}),
  };
}
