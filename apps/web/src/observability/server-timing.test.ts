import { trace } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withRouteMetrics } from './http-metrics';
import { withServerTiming } from './server-timing';

const TRACE_ID = 'a'.repeat(32);
const SPAN_ID = 'b'.repeat(16);

const inSpan = (traceFlags: number) =>
  vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
    spanContext: () => ({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags }),
  } as never);

const call = () =>
  withRouteMetrics('/api/timing', async (_request: Request) => Response.json({ ok: true }))(
    new Request('http://cv.test/api/timing', { method: 'POST' })
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Server-Timing', () => {
  it('names the sampled trace an API response belongs to', async () => {
    inSpan(1);

    const response = await call();

    expect(response.headers.get('server-timing')).toBe(
      `traceparent;desc="00-${TRACE_ID}-${SPAN_ID}-01"`
    );
  });

  it('names nothing when the trace was not sampled: it would never be stored', async () => {
    inSpan(0);

    expect((await call()).headers.get('server-timing')).toBeNull();
  });

  it('names nothing outside a span', async () => {
    expect((await call()).headers.get('server-timing')).toBeNull();
  });

  it('copies a response whose headers cannot change', () => {
    const redirect = Response.redirect('http://cv.test/next', 307);

    const response = withServerTiming(redirect, 'traceparent;desc="x"');

    expect(response).not.toBe(redirect);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://cv.test/next');
    expect(response.headers.get('server-timing')).toBe('traceparent;desc="x"');
  });
});
