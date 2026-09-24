import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contentSecurityPolicy } from '@/lib/csp';

const requestHeaders = new Headers();

vi.mock('./globals.css', () => ({}));

vi.mock('next/font/local', () => ({
  default: ({ variable }: { variable: string }) => ({ variable }),
}));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(requestHeaders),
}));

vi.mock('@/i18n/server', () => ({
  getLocale: () => Promise.resolve('en'),
  getMessages: () => Promise.resolve({}),
}));

vi.mock('@/i18n/client', () => ({
  I18nProvider: () => null,
}));

vi.mock('@/observability/RumProvider', () => ({
  RumProvider: () => null,
}));

vi.mock('@/content/cv', () => ({
  resolveCv: () => ({
    identity: {
      firstName: 'Zigor',
      lastName: 'Lopez',
      title: 'Engineer',
      location: 'Bilbao',
    },
    languages: [{ name: 'English' }],
  }),
}));

type AnyElement = ReactElement<Record<string, unknown>>;

function scriptsIn(node: unknown): AnyElement[] {
  if (Array.isArray(node)) return node.flatMap(scriptsIn);
  if (!isValidElement(node)) return [];

  const element = node as AnyElement;
  const nested = scriptsIn(element.props.children);

  return element.type === 'script' ? [element, ...nested] : nested;
}

async function structuredDataScript(): Promise<AnyElement | undefined> {
  const { default: RootLayout } = await import('./layout');
  const tree = await RootLayout({ children: null });

  return scriptsIn(tree).find((script) => script.props.type === 'application/ld+json');
}

describe('RootLayout structured data', () => {
  beforeEach(() => {
    requestHeaders.delete('content-security-policy-report-only');
  });

  it('stamps the schema.org script with the nonce the policy vouches for', async () => {
    requestHeaders.set('content-security-policy-report-only', contentSecurityPolicy('bm9uY2U='));

    expect((await structuredDataScript())?.props.nonce).toBe('bm9uY2U=');
  });

  it('still renders the script when no policy reached the render', async () => {
    const script = await structuredDataScript();

    expect(script).toBeDefined();
    expect(script?.props.nonce).toBeUndefined();
  });

  it('describes the person search engines came for', async () => {
    const script = await structuredDataScript();
    const html = (script?.props.dangerouslySetInnerHTML as { __html: string }).__html;

    expect(JSON.parse(html)).toMatchObject({
      '@type': 'Person',
      name: 'Zigor Lopez',
      jobTitle: 'Engineer',
    });
  });
});
