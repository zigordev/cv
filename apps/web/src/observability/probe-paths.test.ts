import { describe, expect, it } from 'vitest';

import { isUnsampledPath, pathOfSpan } from './probe-paths';

describe('isUnsampledPath', () => {
  it('drops the paths that would otherwise be most of the traces', () => {
    expect(isUnsampledPath('/health')).toBe(true);
    expect(isUnsampledPath('/metrics')).toBe(true);
    expect(isUnsampledPath('/rum/events')).toBe(true);
    expect(isUnsampledPath('/_next/static/chunks/main.js')).toBe(true);
  });

  it('keeps the paths a visitor actually asks for', () => {
    expect(isUnsampledPath('/')).toBe(false);
    expect(isUnsampledPath('/api/ask')).toBe(false);
    expect(isUnsampledPath('/api/contact')).toBe(false);
    expect(isUnsampledPath('/es')).toBe(false);
  });

  it('does not drop a page whose path merely starts like one of them', () => {
    expect(isUnsampledPath('/healthcheck')).toBe(false);
    expect(isUnsampledPath('/metrics-explained')).toBe(false);
    expect(isUnsampledPath('/rumour')).toBe(false);
  });

  it('ignores the query string', () => {
    expect(isUnsampledPath('/health?probe=compose')).toBe(true);
  });

  it('keeps a span with no path at all, rather than guessing', () => {
    expect(isUnsampledPath(undefined)).toBe(false);
    expect(isUnsampledPath('')).toBe(false);
  });
});

describe('pathOfSpan', () => {
  it('prefers the request path', () => {
    expect(pathOfSpan({ 'url.path': '/health', 'http.route': '/other' })).toBe('/health');
  });

  it('falls back to the route, then to the older target attribute', () => {
    expect(pathOfSpan({ 'http.route': '/api/ask' })).toBe('/api/ask');
    expect(pathOfSpan({ 'http.target': '/metrics' })).toBe('/metrics');
  });

  it('reads the path out of a full url when that is all there is', () => {
    expect(pathOfSpan({ 'url.full': 'https://cv.zigordev.com/health?x=1' })).toBe('/health');
    expect(pathOfSpan({ 'http.url': 'https://cv.zigordev.com/api/ask' })).toBe('/api/ask');
  });

  it('returns nothing for a span that is not an http one', () => {
    expect(pathOfSpan({})).toBeUndefined();
    expect(pathOfSpan({ 'url.full': 'not a url' })).toBeUndefined();
  });
});
