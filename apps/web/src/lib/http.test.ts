import { trace } from '@opentelemetry/api';
import { describe, expect, it, vi } from 'vitest';

import { clientIp, problem } from './http';

const body = async (response: Response) => (await response.json()) as Record<string, unknown>;

describe('problem', () => {
  it('carries the trace id on a 5xx, so a reported failure is findable', async () => {
    const traceId = 'a'.repeat(32);
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({ traceId, spanId: 'b'.repeat(16), traceFlags: 1 }),
    } as never);

    const response = problem('/api/ask', 502, 'ASK.UPSTREAM_FAILED', 'The answer failed.');

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    await expect(body(response)).resolves.toMatchObject({
      code: 'ASK.UPSTREAM_FAILED',
      traceId,
    });

    vi.restoreAllMocks();
  });

  it('leaves a client error alone: nothing failed that anyone needs to trace', async () => {
    const record = await body(problem('/api/ask', 400, 'ASK.INVALID_JSON', 'Not JSON.'));

    expect(record).not.toHaveProperty('traceId');
    expect(record).toMatchObject({ status: 400, title: 'Bad request' });
  });

  it('omits the trace id rather than inventing one outside a span', async () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);

    await expect(
      body(problem('/api/ask', 503, 'ASK.DISABLED', 'Off.'))
    ).resolves.not.toHaveProperty('traceId');

    vi.restoreAllMocks();
  });
});

describe('clientIp', () => {
  it('reads the first address a proxy forwarded', () => {
    const request = new Request('http://cv.test/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });

    expect(clientIp(request)).toBe('203.0.113.7');
  });

  it('says so when there is no address at all', () => {
    expect(clientIp(new Request('http://cv.test/'))).toBe('unknown');
  });
});
