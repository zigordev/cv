import { describe, expect, it } from 'vitest';

import { createRateLimiter, sharedRateLimiter } from './limiter';

const HOUR = 60 * 60 * 1000;

function clock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows the hourly allowance and refuses the next one', () => {
    const time = clock();
    const limiter = createRateLimiter({ perHour: 3, perDay: 10 }, time.now);

    expect([1, 2, 3, 4].map(() => limiter.take('198.51.100.1'))).toEqual([true, true, true, false]);
  });

  it('allows again once the hour has passed', () => {
    const time = clock();
    const limiter = createRateLimiter({ perHour: 1, perDay: 10 }, time.now);

    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    time.advance(HOUR);
    expect(limiter.take('a')).toBe(true);
  });

  it('holds the daily cap across hours', () => {
    const time = clock();
    const limiter = createRateLimiter({ perHour: 2, perDay: 3 }, time.now);

    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    time.advance(HOUR);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    time.advance(23 * HOUR);
    expect(limiter.take('a')).toBe(true);
  });

  it('counts each address separately', () => {
    const limiter = createRateLimiter({ perHour: 1, perDay: 1 }, clock().now);

    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('b')).toBe(true);
    expect(limiter.take('a')).toBe(false);
  });

  it('sweeps addresses with nothing left in the window once the map grows large', () => {
    const time = clock();
    const limiter = createRateLimiter({ perHour: 1, perDay: 1 }, time.now);

    for (let index = 0; index <= 5000; index += 1) limiter.take(`old-${index}`);
    expect(limiter.size()).toBe(5001);

    time.advance(25 * HOUR);
    limiter.take('fresh');
    expect(limiter.size()).toBe(1);
  });
});

describe('sharedRateLimiter', () => {
  it('hands every request the same limiter', () => {
    const limits = { perIpHourly: 6, perIpDaily: 15 };

    expect(sharedRateLimiter(limits)).toBe(sharedRateLimiter(limits));
  });
});
