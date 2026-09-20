import { trace } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withRouteMetrics } from './http-metrics';
import { registry } from './metrics.registry';

const sample = async (metric: string, status: string) => {
  const values = (await registry.getSingleMetric(metric)?.get())?.values ?? [];
  return values.find(
    (value) => value.labels.route === '/api/test' && value.labels.status === status
  )?.value;
};

describe('withRouteMetrics', () => {
  it('counts a request by method, route and status', async () => {
    const handler = withRouteMetrics(
      '/api/test',
      async (_request: Request) => new Response(null, { status: 202 })
    );

    await handler(new Request('http://cv.test/api/test', { method: 'POST' }));

    await expect(sample('http_requests_total', '202')).resolves.toBe(1);
  });

  it('counts a handler that threw as a 500, and lets the error through', async () => {
    const handler = withRouteMetrics('/api/test', async (_request: Request) => {
      throw new Error('boom');
    });

    await expect(
      handler(new Request('http://cv.test/api/test', { method: 'POST' }))
    ).rejects.toThrow('boom');

    await expect(sample('http_requests_total', '500')).resolves.toBe(1);
  });

  it('records the duration in seconds, in the buckets the estate alerts on', async () => {
    const handler = withRouteMetrics(
      '/api/test',
      async (_request: Request) => new Response(null, { status: 200 })
    );

    await handler(new Request('http://cv.test/api/test', { method: 'POST' }));

    const histogram = await registry.getSingleMetric('http_request_duration_seconds')?.get();
    const count = (
      histogram?.values as { metricName?: string; labels: Record<string, unknown>; value: number }[]
    ).find(
      (value) =>
        value.metricName === 'http_request_duration_seconds_count' &&
        value.labels.route === '/api/test'
    );

    expect(count?.value).toBe(1);
  });

  it('labels the route it was given, never the path it was called with', async () => {
    const handler = withRouteMetrics(
      '/api/test',
      async (_request: Request) => new Response(null, { status: 200 })
    );

    await handler(new Request('http://cv.test/api/test?secret=1', { method: 'POST' }));

    const values = (await registry.getSingleMetric('http_requests_total')?.get())?.values ?? [];
    expect(values.every((value) => !String(value.labels.route).includes('secret'))).toBe(true);
  });
});

describe('exemplars', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const inSpan = (traceFlags: number) => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({ traceId: 'c'.repeat(32), spanId: 'd'.repeat(16), traceFlags }),
    } as never);
  };

  it('attaches the trace id of a sampled request to its duration', async () => {
    inSpan(1);
    const handler = withRouteMetrics(
      '/api/exemplar',
      async (_request: Request) => new Response(null, { status: 200 })
    );

    await handler(new Request('http://cv.test/api/exemplar', { method: 'POST' }));

    const exposition = await registry.metrics();
    expect(exposition).toContain('trace_id="cccccccccccccccccccccccccccccccc"');
  });

  it('attaches nothing when the trace was not sampled: a dead link is worse', async () => {
    inSpan(0);
    const handler = withRouteMetrics(
      '/api/unsampled',
      async (_request: Request) => new Response(null, { status: 200 })
    );

    await handler(new Request('http://cv.test/api/unsampled', { method: 'POST' }));

    const exposition = await registry.metrics();
    const line = exposition
      .split('\n')
      .find((entry) => entry.includes('/api/unsampled') && entry.includes('_bucket'));

    expect(line).toBeDefined();
    expect(line).not.toContain('trace_id');
  });
});
