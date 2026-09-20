import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { describe, expect, it } from 'vitest';

import { answerSpanAttributes } from './claude';

function message(overrides: Partial<Record<string, unknown>> = {}): BetaMessage {
  return {
    model: 'claude-opus-5',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 150,
      output_tokens: 350,
      cache_read_input_tokens: 10_400,
      cache_creation_input_tokens: null,
      iterations: null,
    },
    ...overrides,
  } as unknown as BetaMessage;
}

describe('answerSpanAttributes', () => {
  it('carries the model, the token classes and the cost of one answer', () => {
    expect(answerSpanAttributes(message())).toMatchObject({
      'gen_ai.response.model': 'claude-opus-5',
      'gen_ai.response.finish_reasons': ['end_turn'],
      'gen_ai.usage.input_tokens': 150,
      'gen_ai.usage.output_tokens': 350,
      'cv.ask.cache_read_tokens': 10_400,
      'cv.ask.cache_write_tokens': 0,
      'cv.ask.fallback': false,
    });

    expect(answerSpanAttributes(message())['cv.ask.cost_usd']).toBeCloseTo(0.0147, 3);
  });

  it('names an absent stop reason rather than leaving the attribute off', () => {
    expect(answerSpanAttributes(message({ stop_reason: null }))).toMatchObject({
      'gen_ai.response.finish_reasons': ['unknown'],
    });
  });

  it('reports an answer that came from a fallback model', () => {
    const attributes = answerSpanAttributes(
      message({
        model: 'claude-opus-4-8',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          iterations: [
            {
              type: 'fallback_message',
              model: 'claude-opus-4-8',
              input_tokens: 100,
              output_tokens: 200,
              cache_read_input_tokens: 0,
              cache_creation_input_tokens: 0,
            },
          ],
        },
      })
    );

    expect(attributes['cv.ask.fallback']).toBe(true);
    expect(attributes['gen_ai.usage.output_tokens']).toBe(200);
  });
});
