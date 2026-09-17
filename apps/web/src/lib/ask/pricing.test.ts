import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { describe, expect, it } from 'vitest';

import { addUsage, costUsd, spendOf } from './pricing';

const MILLION = 1_000_000;

function usage(
  overrides: Partial<Record<'input' | 'output' | 'cacheRead' | 'cacheWrite', number>>
) {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ...overrides };
}

describe('costUsd', () => {
  it('prices each token class at its own Opus 5 rate', () => {
    expect(costUsd('claude-opus-5', usage({ input: MILLION }))).toBeCloseTo(5);
    expect(costUsd('claude-opus-5', usage({ cacheWrite: MILLION }))).toBeCloseTo(6.25);
    expect(costUsd('claude-opus-5', usage({ cacheRead: MILLION }))).toBeCloseTo(0.5);
    expect(costUsd('claude-opus-5', usage({ output: MILLION }))).toBeCloseTo(25);
  });

  it('prices the first question of a visit and a later one as the spec does', () => {
    const first = usage({ cacheWrite: 10_400, input: 150, output: 350 });
    const later = usage({ cacheRead: 10_400, input: 150, output: 350 });

    expect(costUsd('claude-opus-5', first)).toBeCloseTo(0.0745, 3);
    expect(costUsd('claude-opus-5', later)).toBeCloseTo(0.0147, 3);
  });

  it('matches a dated model id to its family', () => {
    expect(costUsd('claude-sonnet-5-20260101', usage({ input: MILLION }))).toBeCloseTo(2);
  });

  it('prices an unknown model at the most expensive known rate, so the budget errs high', () => {
    expect(costUsd('claude-unknown', usage({ output: MILLION }))).toBeCloseTo(50);
  });

  it('adds usage class by class', () => {
    expect(addUsage(usage({ input: 1, cacheRead: 2 }), usage({ input: 3, output: 4 }))).toEqual(
      usage({ input: 4, output: 4, cacheRead: 2 })
    );
  });
});

describe('spendOf', () => {
  it('reads top-level usage when there are no attempts to add up', () => {
    const spend = spendOf({
      model: 'claude-opus-5',
      usage: {
        input_tokens: 150,
        output_tokens: 350,
        cache_read_input_tokens: 10_400,
        cache_creation_input_tokens: null,
        iterations: null,
      },
    } as unknown as BetaMessage);

    expect(spend.usage).toEqual(usage({ input: 150, output: 350, cacheRead: 10_400 }));
    expect(spend.costUsd).toBeCloseTo(0.0147, 3);
    expect(spend.fallback).toBe(false);
  });

  it('adds every attempt at its own model rate when a fallback ran', () => {
    const spend = spendOf({
      model: 'claude-opus-4-8',
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        iterations: [
          {
            type: 'message',
            model: 'claude-opus-5',
            input_tokens: MILLION,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          {
            type: 'compaction',
            input_tokens: MILLION,
            output_tokens: MILLION,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          {
            type: 'fallback_message',
            model: 'claude-sonnet-5',
            input_tokens: MILLION,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        ],
      },
    } as unknown as BetaMessage);

    expect(spend.usage).toEqual(usage({ input: 2 * MILLION }));
    expect(spend.costUsd).toBeCloseTo(7);
    expect(spend.fallback).toBe(true);
  });

  it('falls back to the message model for an attempt that names none', () => {
    const spend = spendOf({
      model: 'claude-haiku-4-5',
      usage: {
        iterations: [
          {
            type: 'message',
            model: null,
            input_tokens: MILLION,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        ],
      },
    } as unknown as BetaMessage);

    expect(spend.costUsd).toBeCloseTo(1);
  });
});
