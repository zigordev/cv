import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callClaude: vi.fn(),
  askEnabled: vi.fn(),
}));

vi.mock('@/lib/ask/claude', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ask/claude')>()),
  callClaude: mocks.callClaude,
}));

vi.mock('@/flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/flags')>()),
  askEnabled: mocks.askEnabled,
}));

import { registry } from '@/observability/metrics.registry';

import { POST } from './route';

const QUESTION = 'Where has Kafka been used in production?';

let nextAddress = 1;
const freshAddress = () => `203.0.113.${nextAddress++}`;

let stdout: ReturnType<typeof vi.spyOn>;
let stderr: ReturnType<typeof vi.spyOn>;
const saved = { ...process.env };

function post(body: unknown, options: { ip?: string; contentType?: string; length?: string } = {}) {
  const headers: Record<string, string> = {
    'content-type': options.contentType ?? 'application/json',
    'x-forwarded-for': options.ip ?? freshAddress(),
  };
  if (options.length !== undefined) headers['content-length'] = options.length;
  return POST(
    new Request('http://cv.test/api/ask', {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

function reply(
  text: string,
  citations: Array<[number, number]>,
  overrides: Partial<BetaMessage> = {}
): BetaMessage {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    stop_reason: 'end_turn',
    content: [
      {
        type: 'text',
        text,
        citations: citations.map(([start, end]) => ({
          type: 'content_block_location',
          cited_text: 'passage',
          document_index: 0,
          document_title: null,
          start_block_index: start,
          end_block_index: end,
          file_id: null,
        })),
      },
    ],
    usage: {
      input_tokens: 150,
      output_tokens: 350,
      cache_read_input_tokens: 10_400,
      cache_creation_input_tokens: 0,
      iterations: null,
    },
    ...overrides,
  } as unknown as BetaMessage;
}

function logged(event = 'ask.completed') {
  return [...stdout.mock.calls, ...stderr.mock.calls]
    .map(([line]) => JSON.parse(String(line)))
    .filter((record) => record.event === event);
}

async function counter(name: string): Promise<number> {
  const line = (await registry.metrics()).split('\n').find((entry) => entry.startsWith(`${name} `));
  return line ? Number(line.slice(name.length + 1)) : 0;
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  process.env.ASK_BUDGET_PATH = join(mkdtempSync(join(tmpdir(), 'cv-ask-route-')), 'budget.json');
  process.env.ASK_BUDGET_LIMIT_USD = '10';
  delete process.env.ASK_LOG_QUESTIONS;
  delete process.env.ASK_LOG_ANSWERS;
  mocks.askEnabled.mockReset().mockResolvedValue(true);
  mocks.callClaude.mockReset().mockResolvedValue(reply('Kafka carries the pool events.', [[1, 2]]));
  stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...saved };
});

describe('POST /api/ask', () => {
  it('answers a grounded question with the passages it cited', async () => {
    const response = await post({ question: QUESTION, locale: 'en' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      outcome: 'answered',
      answer: 'Kafka carries the pool events.',
      sources: [
        {
          label: expect.stringMatching(/^Experience · /),
          target: { type: 'section', id: 'experience' },
        },
      ],
    });
  });

  it('sends the CV as one cached, citable document followed by the question', async () => {
    await post({ question: QUESTION, locale: 'es' });

    const params = mocks.callClaude.mock.calls[0][0] as MessageCreateParamsNonStreaming;
    expect(params).toMatchObject({
      model: 'claude-opus-5',
      output_config: { effort: 'low' },
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
    });
    const [document, question] = params.messages[0].content as unknown as Array<
      Record<string, unknown>
    >;
    expect(document).toMatchObject({
      type: 'document',
      citations: { enabled: true },
      cache_control: { type: 'ephemeral' },
      context: expect.stringContaining('Spanish (es)'),
    });
    expect(question).toEqual({ type: 'text', text: QUESTION });
  });

  it('logs the question with its parameters, outcome, citations and cost — and no address', async () => {
    await post({ question: QUESTION, locale: 'en' }, { ip: '198.51.100.7' });

    const [record] = logged();
    expect(record).toMatchObject({
      service: 'cv-web',
      level: 'info',
      locale: 'en',
      question: QUESTION,
      outcome: 'answered',
      citations: ['experience'],
      model: 'claude-opus-5',
      effort: 'low',
      stopReason: 'end_turn',
      tokens: { input: 150, output: 350, cacheRead: 10_400, cacheWrite: 0 },
      cacheHit: true,
      budget: { limitUsd: 10 },
    });
    expect(record.costUsd).toBeCloseTo(0.0147, 3);
    expect(JSON.stringify(record)).not.toContain('198.51.100.7');
  });

  it('spends the budget and exposes the spend as metrics', async () => {
    const readBefore = await counter('cv_ask_tokens_total{kind="cache_read"}');
    const answeredBefore = await counter('cv_ask_requests_total{outcome="answered"}');

    await post({ question: QUESTION, locale: 'en' });

    const budget = JSON.parse(readFileSync(process.env.ASK_BUDGET_PATH!, 'utf8'));
    expect(budget.requests).toBe(1);
    expect(budget.costUsd).toBeCloseTo(0.0147, 3);
    expect((await counter('cv_ask_tokens_total{kind="cache_read"}')) - readBefore).toBe(10_400);
    expect((await counter('cv_ask_requests_total{outcome="answered"}')) - answeredBefore).toBe(1);
  });

  it('returns a refusal, not an error, when the model declines', async () => {
    mocks.callClaude.mockResolvedValue(reply('[[CONTACT]]', []));

    const response = await post({ question: 'What is his email?', locale: 'en' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outcome: 'refused', refusal: 'contact' });
    expect(logged()[0]).toMatchObject({ outcome: 'refused', refusal: 'contact' });
  });

  it('refuses an answer that cites nothing', async () => {
    mocks.callClaude.mockResolvedValue(reply('Confident but unsupported.', []));

    await expect((await post({ question: QUESTION, locale: 'en' })).json()).resolves.toEqual({
      outcome: 'refused',
      refusal: 'not_in_cv',
    });
  });

  it('answers 503 and never calls the model when the box is off', async () => {
    mocks.askEnabled.mockResolvedValue(false);

    const response = await post({ question: QUESTION, locale: 'en' });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'ASK.DISABLED' });
    expect(mocks.callClaude).not.toHaveBeenCalled();
  });

  it('holds one address to six questions an hour', async () => {
    const ip = freshAddress();
    for (let index = 0; index < 6; index += 1) {
      expect((await post({ question: QUESTION, locale: 'en' }, { ip })).status).toBe(200);
    }

    const response = await post({ question: QUESTION, locale: 'en' }, { ip });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: 'ASK.RATE_LIMITED' });
    expect(mocks.callClaude).toHaveBeenCalledTimes(6);
    expect(logged().at(-1)).toMatchObject({ outcome: 'rate_limited' });
  });

  it('rests for the month once the budget is spent', async () => {
    process.env.ASK_BUDGET_LIMIT_USD = '0.02';
    await post({ question: QUESTION, locale: 'en' });
    await post({ question: QUESTION, locale: 'en' });

    const response = await post({ question: QUESTION, locale: 'en' });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: 'ASK.BUDGET_EXHAUSTED' });
    expect(mocks.callClaude).toHaveBeenCalledTimes(2);
  });

  it('answers 502 and logs the error class when the API fails', async () => {
    mocks.callClaude.mockRejectedValue(
      Object.assign(new Error('boom'), { name: 'APIConnectionError' })
    );

    const response = await post({ question: QUESTION, locale: 'en' });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: 'ASK.UPSTREAM_FAILED' });
    expect(logged()[0]).toMatchObject({
      level: 'error',
      outcome: 'upstream_error',
      error: 'APIConnectionError',
    });
  });

  it('answers 502 when the answer was cut short, and still records the spend', async () => {
    mocks.callClaude.mockResolvedValue(reply('Cut', [[0, 1]], { stop_reason: 'max_tokens' }));

    const response = await post({ question: QUESTION, locale: 'en' });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: 'ASK.INCOMPLETE' });
    expect(JSON.parse(readFileSync(process.env.ASK_BUDGET_PATH!, 'utf8')).requests).toBe(1);
  });

  it.each([
    ['malformed JSON', '{', {}, 400, 'ASK.INVALID_JSON'],
    ['an empty question', { question: '  ', locale: 'en' }, {}, 400, 'ASK.INVALID_QUESTION'],
    [
      'a long question',
      { question: 'x'.repeat(501), locale: 'en' },
      {},
      400,
      'ASK.INVALID_QUESTION',
    ],
    ['an unknown locale', { question: QUESTION, locale: 'fr' }, {}, 400, 'ASK.INVALID_LOCALE'],
    [
      'the wrong media type',
      { question: QUESTION, locale: 'en' },
      { contentType: 'text/plain' },
      415,
      'ASK.UNSUPPORTED_MEDIA_TYPE',
    ],
    [
      'a declared oversize body',
      { question: QUESTION, locale: 'en' },
      { length: '5000' },
      413,
      'ASK.PAYLOAD_TOO_LARGE',
    ],
  ])('rejects %s without calling the model', async (_, body, options, status, code) => {
    const response = await post(body, options);

    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    await expect(response.json()).resolves.toMatchObject({
      code,
      instance: '/api/ask',
      type: `https://zigordev.com/problems/${code.toLowerCase().replace(/[._]/g, '-')}`,
    });
    expect(mocks.callClaude).not.toHaveBeenCalled();
  });

  it('keeps the question out of the log when asked to', async () => {
    process.env.ASK_LOG_QUESTIONS = 'false';

    await post({ question: QUESTION, locale: 'en' });

    expect(logged()[0]).not.toHaveProperty('question');
    expect(logged()[0]).toMatchObject({ questionChars: QUESTION.length });
  });
});
