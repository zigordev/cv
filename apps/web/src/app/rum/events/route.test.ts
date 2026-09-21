import { describe, expect, it } from 'vitest';

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
      'rum_frustrations_total{frustration_type="dead_click",page="/"} 0'
    );
    expect(exposition).toContain(
      'rum_frustrations_total{frustration_type="rage_click",page="/"} 0'
    );
    expect(exposition).toContain(
      'rum_interactions_total{interaction_type="ask-opened",page="/"} 0'
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
