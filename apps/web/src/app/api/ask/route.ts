import { randomUUID } from 'node:crypto';

import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { NextResponse } from 'next/server';

import { askEnabled } from '@/flags';
import { SUPPORTED_LOCALES } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';
import { interpret } from '@/lib/ask/answer';
import { sharedBudget } from '@/lib/ask/budget';
import { buildRequest, callClaude, describeUpstreamError } from '@/lib/ask/claude';
import { askConfig } from '@/lib/ask/config';
import type { AskAnswer } from '@/lib/ask/contract';
import { buildCorpus } from '@/lib/ask/corpus';
import { sharedRateLimiter } from '@/lib/ask/limiter';
import { askCompletedFields, writeLog, type AskLogInput, type LogLevel } from '@/lib/ask/log';
import { observeOutcome, observeSpend } from '@/lib/ask/metrics';
import { spendOf } from '@/lib/ask/pricing';
import { clientIp, problem } from '@/lib/http';
import { annotateRequest } from '@/observability/spans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INSTANCE = '/api/ask';

type Completion = Omit<AskLogInput, 'requestId' | 'locale' | 'question' | 'latencyMs' | 'budget'>;

export async function POST(request: Request): Promise<Response> {
  const started = performance.now();
  const config = askConfig();

  if (!(await askEnabled())) {
    observeOutcome('disabled');
    return problem(INSTANCE, 503, 'ASK.DISABLED', 'The question box is not available.');
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    observeOutcome('invalid');
    return problem(
      INSTANCE,
      415,
      'ASK.UNSUPPORTED_MEDIA_TYPE',
      'Send the question as application/json.'
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > config.maxBodyBytes) {
    observeOutcome('invalid');
    return problem(INSTANCE, 413, 'ASK.PAYLOAD_TOO_LARGE', 'The request body is too large.', {
      maxBytes: config.maxBodyBytes,
    });
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > config.maxBodyBytes) {
      observeOutcome('invalid');
      return problem(INSTANCE, 413, 'ASK.PAYLOAD_TOO_LARGE', 'The request body is too large.', {
        maxBytes: config.maxBodyBytes,
      });
    }
    payload = JSON.parse(text);
  } catch {
    observeOutcome('invalid');
    return problem(INSTANCE, 400, 'ASK.INVALID_JSON', 'The request body is not valid JSON.');
  }

  const fields =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const question = typeof fields.question === 'string' ? fields.question.trim() : '';
  if (!question || question.length > config.maxQuestionChars) {
    observeOutcome('invalid');
    return problem(
      INSTANCE,
      400,
      'ASK.INVALID_QUESTION',
      'A question is required and must be at most 500 characters.',
      { maxLength: config.maxQuestionChars }
    );
  }

  const locale = SUPPORTED_LOCALES.find((candidate) => candidate === fields.locale);
  if (!locale) {
    observeOutcome('invalid');
    return problem(INSTANCE, 400, 'ASK.INVALID_LOCALE', 'The locale is not supported.', {
      supported: SUPPORTED_LOCALES,
    });
  }

  const requestId = randomUUID();
  const budget = await sharedBudget(config);

  const complete = (completion: Completion, level: LogLevel = 'info') => {
    const latencyMs = performance.now() - started;
    annotateRequest({
      'cv.ask.outcome': completion.outcome,
      'cv.ask.locale': locale,
      'cv.ask.citations': completion.sources?.length ?? 0,
      'cv.ask.budget_used_ratio': budget.usedRatio(),
    });
    observeOutcome(completion.outcome, {
      latencySeconds: latencyMs / 1000,
      citationCount: completion.sources?.length,
      budgetUsedRatio: budget.usedRatio(),
    });

    // A rate-limited question is counted, not written down. Someone pointing a
    // script at this endpoint would otherwise be writing the log.
    if (completion.outcome === 'rate_limited') return;

    writeLog(
      level,
      'ask.completed',
      askCompletedFields(
        { ...completion, requestId, locale, question, latencyMs, budget: budget.state() },
        config
      )
    );
  };

  if (!sharedRateLimiter(config).take(clientIp(request))) {
    complete({ outcome: 'rate_limited' });
    return problem(
      INSTANCE,
      429,
      'ASK.RATE_LIMITED',
      'Too many questions from this address; try again later.'
    );
  }

  if (budget.exhausted()) {
    complete({ outcome: 'budget_exhausted' }, 'warn');
    return problem(
      INSTANCE,
      429,
      'ASK.BUDGET_EXHAUSTED',
      'The question box has used its budget for this month.'
    );
  }

  const corpus = buildCorpus(await loadMessages(locale), locale);

  let message: BetaMessage;
  try {
    message = await callClaude(buildRequest(question, corpus, config), config);
  } catch (error) {
    complete({ outcome: 'upstream_error', error: describeUpstreamError(error) }, 'error');
    return problem(INSTANCE, 502, 'ASK.UPSTREAM_FAILED', 'The answer could not be produced.');
  }

  const spend = spendOf(message);
  await budget.record(spend.usage, spend.costUsd);
  observeSpend(spend);

  const result = interpret(message, corpus.sources);
  const served = {
    model: message.model,
    stopReason: message.stop_reason ?? undefined,
    spend,
    text: result.outcome === 'answered' ? result.answer : result.text,
  };

  if (result.outcome === 'incomplete') {
    complete({ outcome: 'incomplete', ...served }, 'warn');
    return problem(INSTANCE, 502, 'ASK.INCOMPLETE', 'The answer was cut short.');
  }

  if (result.outcome === 'refused') {
    complete({ outcome: 'refused', refusal: result.refusal, ...served });
    return NextResponse.json({ outcome: 'refused', refusal: result.refusal } satisfies AskAnswer);
  }

  complete({ outcome: 'answered', sources: result.sources, ...served });
  return NextResponse.json({
    outcome: 'answered',
    answer: result.answer,
    sources: result.sources,
  } satisfies AskAnswer);
}
