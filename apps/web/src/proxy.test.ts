import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from './proxy';

const policyOf = (response: Response) =>
  response.headers.get('content-security-policy-report-only') ?? '';

const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];

const visit = () => proxy(new NextRequest('https://cv.zigordev.com/'));

describe('proxy', () => {
  it('reports against a policy whose scripts need the nonce or this origin', () => {
    const policy = policyOf(visit());
    const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src '));

    expect(scripts).toBe(`script-src 'self' 'nonce-${nonceOf(policy)}'`);
    expect(policy).toContain('report-uri /rum/csp');
  });

  it('hands the same policy to the render, which stamps its own scripts with the nonce', () => {
    const response = visit();

    expect(response.headers.get('x-middleware-request-content-security-policy-report-only')).toBe(
      policyOf(response)
    );
  });

  it('gives every page view a nonce of its own', () => {
    const nonces = new Set(Array.from({ length: 5 }, () => nonceOf(policyOf(visit()))));

    expect(nonces.size).toBe(5);
    expect([...nonces].every((nonce) => nonce && nonce.length >= 24)).toBe(true);
  });
});
