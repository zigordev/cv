import type {
  BetaMessage,
  BetaTextBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';

import type { AskSource, Refusal } from './contract';
import { containsContactDetail } from './guard';
import { REFUSAL_MARKERS } from './prompt';

export type Interpretation =
  | {
      readonly outcome: 'answered';
      readonly answer: string;
      readonly sources: readonly AskSource[];
    }
  | { readonly outcome: 'refused'; readonly refusal: Refusal; readonly text: string }
  | { readonly outcome: 'incomplete'; readonly stopReason: string; readonly text: string };

const INCOMPLETE_STOP_REASONS = new Set([
  'max_tokens',
  'model_context_window_exceeded',
  'pause_turn',
]);

const MARKERS = Object.entries(REFUSAL_MARKERS) as ReadonlyArray<readonly [Refusal, string]>;

function citedBlockIndices(blocks: readonly BetaTextBlock[], sourceCount: number): number[] {
  const cited: number[] = [];
  for (const block of blocks) {
    for (const citation of block.citations ?? []) {
      if (citation.type !== 'content_block_location' || citation.document_index !== 0) continue;
      const end = Math.max(citation.end_block_index, citation.start_block_index + 1);
      for (let index = citation.start_block_index; index < end; index += 1) {
        if (index >= 0 && index < sourceCount && !cited.includes(index)) cited.push(index);
      }
    }
  }
  return cited;
}

export function interpret(message: BetaMessage, sources: readonly AskSource[]): Interpretation {
  const textBlocks = message.content.filter(
    (block): block is BetaTextBlock => block.type === 'text'
  );
  const text = textBlocks
    .map((block) => block.text)
    .join('')
    .trim();
  const stopReason = message.stop_reason ?? 'unknown';

  if (stopReason === 'refusal') return { outcome: 'refused', refusal: 'off_topic', text };
  if (INCOMPLETE_STOP_REASONS.has(stopReason)) return { outcome: 'incomplete', stopReason, text };

  const marker = MARKERS.find(([, value]) => text.includes(value));
  if (marker) return { outcome: 'refused', refusal: marker[0], text };

  if (containsContactDetail(text)) return { outcome: 'refused', refusal: 'contact', text };

  const cited = citedBlockIndices(textBlocks, sources.length);
  if (!text || cited.length === 0) return { outcome: 'refused', refusal: 'not_in_cv', text };

  return { outcome: 'answered', answer: text, sources: cited.map((index) => sources[index]) };
}
