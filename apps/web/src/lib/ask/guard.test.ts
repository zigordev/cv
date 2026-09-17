import { describe, expect, it } from 'vitest';

import { containsContactDetail } from './guard';

describe('containsContactDetail', () => {
  it.each([
    'Write to ada@example.com any time.',
    'ada.lovelace+cv@mail.example.org',
    'Call +34 600 123 456 after six.',
    '+44 20 7946 0958',
    'The mobile is 612 345 678.',
    'Call 612345678, any day.',
    '612345678',
    'linkedin.com/in/someone',
    'https://x.com/someone',
    'https://wa.me/34600123456',
  ])('catches %s', (text) => {
    expect(containsContactDetail(text)).toBe(true);
  });

  it.each([
    'From 2019 – 2023 at DEHN.',
    'design-system@v0.1.42',
    'A 4,266 × 3,132 m site.',
    'One t3.large for $99 a month.',
    'Pinned at 0.126.0.',
    'Reference 612345678.5 in the ledger.',
    'Order 1612345678 shipped.',
    'https://gpool.zigordev.com',
    'npm install @anthropic-ai/sdk',
    'Node 24 and TypeScript 5.1.',
    'linux.com/news',
  ])('leaves %s alone', (text) => {
    expect(containsContactDetail(text)).toBe(false);
  });
});
