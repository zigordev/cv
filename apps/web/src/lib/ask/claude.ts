import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { withSpan } from '@/observability/spans';

import type { AskConfig } from './config';
import type { Corpus } from './corpus';
import { spendOf } from './pricing';
import { SYSTEM_PROMPT } from './prompt';

import type { Attributes } from '@opentelemetry/api';

export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function buildRequest(
  question: string,
  corpus: Corpus,
  config: AskConfig
): MessageCreateParamsNonStreaming {
  return {
    model: config.model,
    max_tokens: config.maxTokens,
    system: SYSTEM_PROMPT,
    output_config: { effort: config.effort },
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'content', content: [...corpus.blocks] },
            title: corpus.title,
            context: corpus.context,
            citations: { enabled: true },
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: question },
        ],
      },
    ],
  };
}

let client: Anthropic | undefined;

export function answerSpanAttributes(message: BetaMessage): Attributes {
  const spend = spendOf(message);

  return {
    'gen_ai.response.model': message.model,
    'gen_ai.response.finish_reasons': [message.stop_reason ?? 'unknown'],
    'gen_ai.usage.input_tokens': spend.usage.input,
    'gen_ai.usage.output_tokens': spend.usage.output,
    'cv.ask.cache_read_tokens': spend.usage.cacheRead,
    'cv.ask.cache_write_tokens': spend.usage.cacheWrite,
    'cv.ask.cost_usd': spend.costUsd,
    'cv.ask.fallback': spend.fallback,
  };
}

export function callClaude(
  params: MessageCreateParamsNonStreaming,
  config: Pick<AskConfig, 'timeoutMs' | 'maxRetries'>
): Promise<BetaMessage> {
  client ??= new Anthropic({ timeout: config.timeoutMs, maxRetries: config.maxRetries });

  return withSpan(
    `chat ${params.model}`,
    async (span) => {
      const message = await client!.beta.messages.create(params);
      span.setAttributes(answerSpanAttributes(message));
      return message;
    },
    {
      'gen_ai.operation.name': 'chat',
      'gen_ai.provider.name': 'anthropic',
      'gen_ai.request.model': params.model,
      'gen_ai.request.max_tokens': params.max_tokens,
    }
  );
}

export function describeUpstreamError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.name}${error.status ? ` ${error.status}` : ''}`;
  }
  return error instanceof Error ? error.name : 'UnknownError';
}
