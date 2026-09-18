import type {
  BetaMessage,
  BetaTextBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { describe, expect, it } from 'vitest';

import { interpret } from './answer';
import type { AskSource } from './contract';

const sources: AskSource[] = [
  { label: 'Summary', target: { type: 'section', id: 'intro' } },
  { label: 'gpool · Overview', target: { type: 'project', id: 'gpool', tab: 'overview' } },
  { label: 'gpool · Decisions', target: { type: 'project', id: 'gpool', tab: 'architecture' } },
];

function cited(text: string, ...ranges: Array<[number, number, number?]>): BetaTextBlock {
  return {
    type: 'text',
    text,
    citations: ranges.map(([start, end, documentIndex = 0]) => ({
      type: 'content_block_location',
      cited_text: 'passage',
      document_index: documentIndex,
      document_title: null,
      start_block_index: start,
      end_block_index: end,
      file_id: null,
    })),
  };
}

function message(
  content: BetaMessage['content'],
  stopReason: BetaMessage['stop_reason'] = 'end_turn'
): BetaMessage {
  return { content, stop_reason: stopReason, model: 'claude-opus-5' } as unknown as BetaMessage;
}

describe('interpret', () => {
  it('returns the prose and the sources it cited, in order and without repeats', () => {
    const result = interpret(
      message([
        cited('Kafka carries the pool events. ', [1, 2]),
        cited('It was chosen deliberately.', [2, 3], [1, 2]),
      ]),
      sources
    );

    expect(result).toEqual({
      outcome: 'answered',
      answer: 'Kafka carries the pool events. It was chosen deliberately.',
      sources: [sources[1], sources[2]],
    });
  });

  it('spans a citation across every block in its range', () => {
    const result = interpret(message([cited('Two blocks.', [0, 2])]), sources);

    expect(result.outcome === 'answered' && result.sources).toEqual([sources[0], sources[1]]);
  });

  it.each([
    ['[[NOT_IN_CV]]', 'not_in_cv'],
    ['[[CONTACT]]', 'contact'],
    ['[[SPECULATION]]', 'speculation'],
    ['[[OFF_TOPIC]]', 'off_topic'],
  ])('turns the %s marker into a refusal', (marker, refusal) => {
    expect(interpret(message([cited(marker)]), sources)).toEqual({
      outcome: 'refused',
      refusal,
      text: marker,
    });
  });

  it('refuses an answer that cites nothing, however confident it sounds', () => {
    const result = interpret(message([cited('An expert in everything.')]), sources);

    expect(result).toMatchObject({ outcome: 'refused', refusal: 'not_in_cv' });
  });

  it('ignores citations to other documents or outside the CV', () => {
    const result = interpret(message([cited('Stray.', [0, 1, 1], [9, 10])]), sources);

    expect(result).toMatchObject({ outcome: 'refused', refusal: 'not_in_cv' });
  });

  it('replaces anything shaped like a contact detail, even when cited', () => {
    const result = interpret(message([cited('Write to someone@example.com.', [0, 1])]), sources);

    expect(result).toMatchObject({ outcome: 'refused', refusal: 'contact' });
  });

  it('treats a safety refusal as off topic rather than an error', () => {
    expect(interpret(message([], 'refusal'), sources)).toMatchObject({
      outcome: 'refused',
      refusal: 'off_topic',
    });
  });

  it.each(['max_tokens', 'model_context_window_exceeded'] as const)(
    'reports a %s stop as incomplete',
    (stopReason) => {
      expect(interpret(message([cited('Cut', [0, 1])], stopReason), sources)).toEqual({
        outcome: 'incomplete',
        stopReason,
        text: 'Cut',
      });
    }
  );

  it('skips blocks that are not text, such as a fallback marker', () => {
    const result = interpret(
      message([
        {
          type: 'fallback',
          from: { model: 'claude-opus-5' },
          to: { model: 'claude-opus-4-8' },
        } as unknown as BetaMessage['content'][number],
        cited('Grounded.', [0, 1]),
      ]),
      sources
    );

    expect(result).toMatchObject({ outcome: 'answered', answer: 'Grounded.' });
  });
});
