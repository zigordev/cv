import { afterEach, describe, expect, it, vi } from 'vitest';

import { registry } from '@/observability/metrics.registry';

import { POST } from './route';

let nextAddress = 1;
const freshAddress = () => `203.0.113.${nextAddress++}`;

const beacon = {
  events: [{ type: 'navigation', name: 'Page View', page: '/', navigationDepth: 1 }],
};

const post = (headers: Record<string, string>) =>
  POST(
    new Request('http://0.0.0.0:3001/rum/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': freshAddress(),
        ...headers,
      },
      body: JSON.stringify(beacon),
    })
  );

const pageViews = async () => {
  const metric = await registry.getSingleMetric('rum_navigations_total')?.get();
  return metric?.values.find((value) => value.labels.navigation_type === 'Page View')?.value ?? 0;
};

describe('POST /rum/events', () => {
  it('exports the home page series at zero before any beacon arrives', async () => {
    const exposition = await registry.metrics();

    expect(exposition).toContain(
      'rum_frustrations_total{frustration_type="dead_click",page="/",release="unknown"} 0'
    );
    expect(exposition).toContain(
      'rum_frustrations_total{frustration_type="rage_click",page="/",release="unknown"} 0'
    );
    expect(exposition).toContain(
      'rum_interactions_total{interaction_type="ask-opened",page="/",release="unknown"} 0'
    );
  });

  it('accepts a beacon from the public host while the server runs on its bind address', async () => {
    const before = await pageViews();

    const response = await post({ host: 'cv.zigordev.com', origin: 'https://cv.zigordev.com' });

    expect(response.status).toBe(204);
    expect(await pageViews()).toBe(before + 1);
  });

  it('accepts a beacon through the local port mapping', async () => {
    const response = await post({ host: 'localhost:3021', origin: 'http://localhost:3021' });

    expect(response.status).toBe(204);
  });

  it('accepts a beacon with no Origin header', async () => {
    const response = await post({ host: 'cv.zigordev.com' });

    expect(response.status).toBe(204);
  });

  it('refuses a beacon posted from another site', async () => {
    const before = await pageViews();

    const response = await post({ host: 'cv.zigordev.com', origin: 'https://evil.example' });

    expect(response.status).toBe(403);
    expect(await pageViews()).toBe(before);
  });

  it('refuses an opaque origin', async () => {
    const response = await post({ host: 'cv.zigordev.com', origin: 'null' });

    expect(response.status).toBe(403);
  });

  it('refuses a beacon when the request names no host', async () => {
    const response = await post({ origin: 'https://cv.zigordev.com' });

    expect(response.status).toBe(403);
  });
});

const send = (events: unknown[], headers: Record<string, string> = {}) =>
  POST(
    new Request('http://0.0.0.0:3001/rum/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: 'cv.zigordev.com',
        'x-forwarded-for': freshAddress(),
        ...headers,
      },
      body: JSON.stringify({ events }),
    })
  );

const sample = async (metric: string, labels: Record<string, string>) => {
  const values = (await registry.getSingleMetric(metric)?.get())?.values ?? [];
  return (
    values.find((value) =>
      Object.entries(labels).every(([key, expected]) => value.labels[key] === expected)
    )?.value ?? 0
  );
};

describe('RUM v2', () => {
  const logged: Record<string, unknown>[] = [];

  const captureLogs = () => {
    logged.length = 0;
    const capture = (chunk: string | Uint8Array) => {
      logged.push(JSON.parse(String(chunk)));
      return true;
    };
    vi.spyOn(process.stdout, 'write').mockImplementation(capture as never);
    vi.spyOn(process.stderr, 'write').mockImplementation(capture as never);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts a refused cross-origin beacon', async () => {
    const before = await sample('rum_rejected_total', { reason: 'cross_origin' });

    await post({ host: 'cv.zigordev.com', origin: 'https://evil.example' });

    expect(await sample('rum_rejected_total', { reason: 'cross_origin' })).toBe(before + 1);
  });

  it("files a page that is not one of the site's routes under other", async () => {
    const before = await sample('rum_navigations_total', {
      navigation_type: 'Page View',
      page: 'other',
    });

    await send([{ type: 'navigation', name: 'Page View', page: '/abc', navigationDepth: 1 }]);

    expect(
      await sample('rum_navigations_total', { navigation_type: 'Page View', page: 'other' })
    ).toBe(before + 1);
  });

  it('starts every business event at zero', async () => {
    const exposition = await registry.metrics();

    for (const name of ['ask-answer-shown', 'contact-sent', 'cv-downloaded', 'locale-switched']) {
      expect(exposition).toContain(
        `rum_interactions_total{interaction_type="${name}",page="/",release="unknown"} 0`
      );
    }
  });

  it('logs a browser error once, with its message masked', async () => {
    captureLogs();
    const error = {
      type: 'error',
      name: 'JavaScript Error',
      page: '/',
      error: { type: 'TypeError', message: 'Failed for bob@example.com after 3 tries' },
    };

    await send([error, error]);

    const errors = logged.filter((line) => line.event === 'rum.client_error');
    expect(errors).toEqual([
      expect.objectContaining({
        page: '/',
        error: { name: 'TypeError', message: 'Failed for <email> after <n> tries' },
      }),
    ]);
  });

  it('logs a poor vital with the element that caused it', async () => {
    captureLogs();

    await send([
      {
        type: 'performance',
        name: 'INP',
        value: 640,
        page: '/',
        rating: 'poor',
        target: 'div.cv-ask>button',
      },
    ]);

    expect(logged).toContainEqual(
      expect.objectContaining({
        event: 'rum.vital_poor',
        metric: 'INP',
        value: 640,
        target: 'div.cv-ask>button',
      })
    );
  });

  it('links a page-load vital to the trace that served the page', async () => {
    await send([
      { type: 'performance', name: 'LCP', value: 1800, page: '/', traceId: 'e'.repeat(32) },
    ]);

    expect(await registry.metrics()).toContain(`trace_id="${'e'.repeat(32)}"`);
  });

  it('ignores a trace id that is not one', async () => {
    await send([
      { type: 'performance', name: 'TTFB', value: 90, page: '/', traceId: '0'.repeat(32) },
    ]);

    expect(await registry.metrics()).not.toContain(`trace_id="${'0'.repeat(32)}"`);
  });
});
