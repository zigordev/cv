import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AskConfig } from './config';
import { askConfig } from './config';
import { askCompletedFields, roundUsd, sourceKey, writeLog, type AskLogInput } from './log';

const saved = { ...process.env };

let stdout: ReturnType<typeof vi.spyOn>;
let stderr: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...saved };
});

const base: AskLogInput = {
  requestId: 'req-1',
  locale: 'en',
  question: 'Where has Kafka been used in production?',
  outcome: 'answered',
  latencyMs: 2140.4,
  budget: {
    month: '2026-09',
    requests: 3,
    costUsd: 3.41,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  sources: [
    { label: 'gpool · Decisions', target: { type: 'project', id: 'gpool', tab: 'architecture' } },
    { label: 'Summary', target: { type: 'section', id: 'intro' } },
  ],
  text: 'Kafka carries the pool events.',
  model: 'claude-opus-5',
  stopReason: 'end_turn',
  spend: {
    usage: { input: 152, output: 288, cacheRead: 10_412, cacheWrite: 0 },
    costUsd: 0.01252356,
    fallback: false,
  },
};

function config(overrides: Partial<AskConfig> = {}): AskConfig {
  return { ...askConfig(), ...overrides };
}

describe('writeLog', () => {
  it('writes one JSON line naming the service Alloy labels it by', () => {
    process.env.OTEL_SERVICE_NAME = 'cv-web';
    writeLog('info', 'ask.completed', { outcome: 'answered' });

    expect(stdout).toHaveBeenCalledTimes(1);
    const line = String(stdout.mock.calls[0][0]);
    expect(line.endsWith('\n')).toBe(true);
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      level: 'info',
      service: 'cv-web',
      event: 'ask.completed',
      outcome: 'answered',
    });
    // The fields are the record, not a nested `message`: Loki flattens a
    // nested object into `message_event`, which no query in the estate reads.
    expect(record).not.toHaveProperty('message');
  });

  it('sends errors to stderr', () => {
    process.env.OTEL_SERVICE_NAME = 'cv-web';
    writeLog('error', 'ask.completed');

    expect(stdout).not.toHaveBeenCalled();
    expect(JSON.parse(String(stderr.mock.calls[0][0]))).toMatchObject({
      service: 'cv-web',
      event: 'ask.completed',
    });
  });
});

describe('askCompletedFields', () => {
  it('records the question and every parameter that shaped the answer', () => {
    expect(askCompletedFields(base, config())).toEqual({
      requestId: 'req-1',
      locale: 'en',
      question: 'Where has Kafka been used in production?',
      questionChars: 40,
      outcome: 'answered',
      refusal: null,
      citations: ['projects/gpool/architecture', 'intro'],
      citationCount: 2,
      model: 'claude-opus-5',
      effort: 'low',
      stopReason: 'end_turn',
      tokens: { input: 152, output: 288, cacheRead: 10_412, cacheWrite: 0 },
      cacheHit: true,
      fallback: false,
      costUsd: 0.012524,
      budget: { month: '2026-09', monthUsd: 3.41, limitUsd: 10, usedRatio: 0.341 },
      latencyMs: 2140,
    });
  });

  it('drops only the question text when question logging is off', () => {
    const fields = askCompletedFields(base, config({ logQuestions: false }));

    expect(fields).not.toHaveProperty('question');
    expect(fields).toMatchObject({ questionChars: 40, outcome: 'answered' });
  });

  it('adds the answer only when answer logging is on', () => {
    expect(askCompletedFields(base, config())).not.toHaveProperty('answer');
    expect(askCompletedFields(base, config({ logAnswers: true }))).toMatchObject({
      answer: 'Kafka carries the pool events.',
    });
  });

  it('describes a request that never reached the model', () => {
    const fields = askCompletedFields(
      {
        ...base,
        outcome: 'rate_limited',
        sources: undefined,
        spend: undefined,
        model: undefined,
        stopReason: undefined,
        text: undefined,
        error: undefined,
      },
      config()
    );

    expect(fields).toMatchObject({
      outcome: 'rate_limited',
      citations: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      cacheHit: false,
      costUsd: 0,
      model: 'claude-opus-5',
      stopReason: null,
    });
  });

  it('carries the upstream error name when there is one', () => {
    expect(askCompletedFields({ ...base, error: 'APIError 529' }, config())).toMatchObject({
      error: 'APIError 529',
    });
  });

  it('has no field that could identify who asked', () => {
    const keys = Object.keys(askCompletedFields(base, config({ logAnswers: true })));

    expect(keys.filter((key) => /ip|address|forwarded|agent|session|user/i.test(key))).toEqual([]);
  });
});

describe('helpers', () => {
  it('rounds to a millionth of a dollar', () => {
    expect(roundUsd(0.0125235649)).toBe(0.012524);
  });

  it('keys sections by id and project parts by project and tab', () => {
    expect(sourceKey({ label: 'x', target: { type: 'section', id: 'skills' } })).toBe('skills');
    expect(
      sourceKey({ label: 'x', target: { type: 'project', id: 'sity', tab: 'pipelines' } })
    ).toBe('projects/sity/pipelines');
  });
});
