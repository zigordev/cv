import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages';

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
}

interface Rate {
  readonly input: number;
  readonly output: number;
}

const RATES: ReadonlyArray<readonly [string, Rate]> = [
  ['claude-opus-5', { input: 5, output: 25 }],
  ['claude-opus-4-8', { input: 5, output: 25 }],
  ['claude-sonnet-5', { input: 2, output: 10 }],
  ['claude-haiku-4-5', { input: 1, output: 5 }],
  ['claude-fable-5-1', { input: 10, output: 50 }],
];

const UNKNOWN_MODEL_RATE: Rate = { input: 10, output: 50 };

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export const EMPTY_USAGE: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

function rateFor(model: string): Rate {
  const exact = RATES.find(([id]) => id === model);
  if (exact) return exact[1];
  const prefixed = RATES.find(([id]) => model.startsWith(`${id}-`));
  return prefixed ? prefixed[1] : UNKNOWN_MODEL_RATE;
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  };
}

export function costUsd(model: string, usage: TokenUsage): number {
  const rate = rateFor(model);
  const inputCost =
    usage.input * rate.input +
    usage.cacheWrite * rate.input * CACHE_WRITE_MULTIPLIER +
    usage.cacheRead * rate.input * CACHE_READ_MULTIPLIER;
  return (inputCost + usage.output * rate.output) / 1_000_000;
}

export interface MessageSpend {
  readonly usage: TokenUsage;
  readonly costUsd: number;
  readonly fallback: boolean;
}

export function spendOf(message: BetaMessage): MessageSpend {
  const attempts = (message.usage.iterations ?? []).filter(
    (entry) => entry.type === 'message' || entry.type === 'fallback_message'
  );

  if (attempts.length === 0) {
    const usage: TokenUsage = {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      cacheRead: message.usage.cache_read_input_tokens ?? 0,
      cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
    };
    return { usage, costUsd: costUsd(message.model, usage), fallback: false };
  }

  let usage = EMPTY_USAGE;
  let cost = 0;
  for (const attempt of attempts) {
    const attemptUsage: TokenUsage = {
      input: attempt.input_tokens,
      output: attempt.output_tokens,
      cacheRead: attempt.cache_read_input_tokens,
      cacheWrite: attempt.cache_creation_input_tokens,
    };
    usage = addUsage(usage, attemptUsage);
    cost += costUsd(attempt.model ?? message.model, attemptUsage);
  }

  return {
    usage,
    costUsd: cost,
    fallback: attempts.some((entry) => entry.type === 'fallback_message'),
  };
}
