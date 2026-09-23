import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, nonceFrom } from './csp';

describe('contentSecurityPolicy', () => {
  it('vouches for scripts carrying the nonce and reports everything else', () => {
    const policy = contentSecurityPolicy('bm9uY2U=');

    expect(policy).toContain("script-src 'self' 'nonce-bm9uY2U='");
    expect(policy).toContain('report-uri /rum/csp');
  });

  it('keeps the page talking only to its own origin', () => {
    expect(contentSecurityPolicy('n')).toContain("connect-src 'self'");
  });
});

describe('nonceFrom', () => {
  it('gives back the nonce a policy carries, so a hand-written script can use it', () => {
    expect(nonceFrom(contentSecurityPolicy('bm9uY2U='))).toBe('bm9uY2U=');
  });

  it('reads the nonce whichever directive order the policy uses', () => {
    expect(nonceFrom("script-src 'nonce-abc123' 'self'; default-src 'self'")).toBe('abc123');
  });

  it('has nothing to give when the header is absent or carries no nonce', () => {
    expect(nonceFrom("default-src 'self'")).toBeUndefined();
    expect(nonceFrom(null)).toBeUndefined();
    expect(nonceFrom(undefined)).toBeUndefined();
    expect(nonceFrom('')).toBeUndefined();
  });
});
