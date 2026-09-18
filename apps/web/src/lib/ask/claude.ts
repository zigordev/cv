import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';

import type { AskConfig } from './config';
import type { Corpus } from './corpus';
import { SYSTEM_PROMPT } from './prompt';

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

export function callClaude(
  params: MessageCreateParamsNonStreaming,
  config: Pick<AskConfig, 'timeoutMs' | 'maxRetries'>
): Promise<BetaMessage> {
  client ??= new Anthropic({ timeout: config.timeoutMs, maxRetries: config.maxRetries });
  return client.beta.messages.create(params);
}

export function describeUpstreamError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.name}${error.status ? ` ${error.status}` : ''}`;
  }
  return error instanceof Error ? error.name : 'UnknownError';
}
