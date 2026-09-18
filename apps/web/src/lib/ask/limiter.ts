const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SWEEP_THRESHOLD = 5000;

export interface RateLimiter {
  take(key: string): boolean;
  size(): number;
}

export function createRateLimiter(
  limits: { readonly perHour: number; readonly perDay: number },
  now: () => number = Date.now
): RateLimiter {
  const hits = new Map<string, number[]>();

  function sweep(at: number) {
    for (const [key, times] of hits) {
      if (times.every((time) => at - time >= DAY_MS)) hits.delete(key);
    }
  }

  return {
    take(key: string): boolean {
      const at = now();
      const today = (hits.get(key) ?? []).filter((time) => at - time < DAY_MS);
      const lastHour = today.filter((time) => at - time < HOUR_MS).length;

      if (lastHour >= limits.perHour || today.length >= limits.perDay) {
        hits.set(key, today);
        return false;
      }

      today.push(at);
      hits.set(key, today);
      if (hits.size > SWEEP_THRESHOLD) sweep(at);
      return true;
    },
    size(): number {
      return hits.size;
    },
  };
}

let shared: RateLimiter | undefined;

export function sharedRateLimiter(limits: {
  readonly perIpHourly: number;
  readonly perIpDaily: number;
}): RateLimiter {
  shared ??= createRateLimiter({ perHour: limits.perIpHourly, perDay: limits.perIpDaily });
  return shared;
}
