import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetCspReports } from '@/observability/csp-reports';
import { registry } from '@/observability/metrics.registry';

import { POST } from './route';

let nextAddress = 1;
const freshAddress = () => `198.51.100.${nextAddress++}`;

const logged: Record<string, unknown>[] = [];

beforeEach(() => {
  logged.length = 0;
  resetCspReports();
  const capture = (chunk: string | Uint8Array) => {
    logged.push(JSON.parse(String(chunk)));
    return true;
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(capture as never);
  vi.spyOn(process.stderr, 'write').mockImplementation(capture as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const report = (body: unknown, contentType: string, address = freshAddress()) =>
  POST(
    new Request('http://0.0.0.0:3001/rum/csp', {
      method: 'POST',
      headers: { 'content-type': contentType, 'x-forwarded-for': address },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );

const violations = async (directive: string) => {
  const metric = await registry.getSingleMetric('csp_violations_total')?.get();
  return metric?.values.find((value) => value.labels.directive === directive)?.value ?? 0;
};

const legacy = {
  'csp-report': {
    'document-uri': 'https://cv.zigordev.com/?utm=secret',
    'violated-directive': 'script-src-elem',
    'effective-directive': 'script-src-elem',
    'blocked-uri': 'inline',
    'source-file': 'https://cv.zigordev.com/_next/static/chunks/app.js',
    'line-number': 12,
    disposition: 'report',
  },
};

const reportingApi = [
  {
    type: 'csp-violation',
    url: 'https://cv.zigordev.com/',
    body: {
      documentURL: 'https://cv.zigordev.com/private/token123',
      effectiveDirective: 'img-src',
      blockedURL: 'https://tracker.example/pixel.gif?id=42',
      disposition: 'report',
    },
  },
  { type: 'deprecation', body: { id: 'x' } },
];

describe('POST /rum/csp', () => {
  it('counts a report-uri report by directive and logs it without the query string', async () => {
    const before = await violations('script-src-elem');

    const response = await report(legacy, 'application/csp-report');

    expect(response.status).toBe(204);
    expect(await violations('script-src-elem')).toBe(before + 1);
    expect(logged).toEqual([
      expect.objectContaining({
        level: 'warn',
        event: 'csp.violation',
        directive: 'script-src-elem',
        blocked: 'inline',
        source: '/_next/static/chunks/app.js',
        line: 12,
        page: '/',
        disposition: 'report',
      }),
    ]);
  });

  it('counts a Reporting API batch, keeps only the blocked origin and ignores other report types', async () => {
    const before = await violations('img-src');

    const response = await report(reportingApi, 'application/reports+json');

    expect(response.status).toBe(204);
    expect(await violations('img-src')).toBe(before + 1);
    expect(logged).toEqual([
      expect.objectContaining({
        event: 'csp.violation',
        directive: 'img-src',
        blocked: 'https://tracker.example',
        page: 'other',
      }),
    ]);
  });

  it('logs the same violation once, but counts every one', async () => {
    const before = await violations('script-src-elem');

    await report(legacy, 'application/csp-report');
    await report(legacy, 'application/csp-report');

    expect(await violations('script-src-elem')).toBe(before + 2);
    expect(logged).toHaveLength(1);
  });

  it('files an unknown directive under other', async () => {
    const before = await violations('other');

    await report(
      { 'csp-report': { 'effective-directive': 'made-up-src', 'blocked-uri': 'eval' } },
      'application/csp-report'
    );

    expect(await violations('other')).toBe(before + 1);
  });

  it('refuses a body that is not a report', async () => {
    expect((await report({ hello: 'world' }, 'application/json')).status).toBe(400);
    expect((await report('not json', 'application/csp-report')).status).toBe(400);
  });

  it('refuses a body over the size cap unread', async () => {
    const response = await POST(
      new Request('http://0.0.0.0:3001/rum/csp', {
        method: 'POST',
        headers: { 'content-length': String(1024 * 1024), 'x-forwarded-for': freshAddress() },
        body: '{}',
      })
    );

    expect(response.status).toBe(413);
  });

  it('rate limits one client', async () => {
    const address = freshAddress();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await report(legacy, 'application/csp-report', address)).status);
    }

    expect(statuses.at(-1)).toBe(429);
  });
});
