import { expect, test } from '@playwright/test';

/**
 * Performance budgets, measured in a real browser.
 *
 * These are Lighthouse's Core Web Vitals thresholds, asserted directly through
 * the Performance API rather than by running Lighthouse: the numbers are the
 * same, the run is seconds instead of a minute, and it needs no extra service.
 * The RUM pipeline measures the same metrics on real visitors — this is the
 * gate that stops a regression reaching them.
 *
 * The budgets are the "good" boundary, not the "poor" one. A build that lands
 * between good and poor should fail here, because that is the point at which a
 * visitor starts noticing.
 */
const BUDGETS = {
  // Largest Contentful Paint: good under 2.5s.
  lcpMs: 2_500,
  // Cumulative Layout Shift: good under 0.1.
  cls: 0.1,
  // Total transferred bytes for a first visit. cv is a single page of text and
  // SVG; anything approaching a megabyte means something was imported by
  // accident.
  transferBytes: 900_000,
};

test('meets its Core Web Vitals budgets', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        // `buffered` picks up the entry that fired before this ran.
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries.at(-1)?.startTime ?? 0);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        // A page with no LCP entry at all is a pass, not a hang.
        setTimeout(() => resolve(0), 5_000);
      }),
  );
  expect(lcp, `LCP ${Math.round(lcp)}ms`).toBeLessThan(BUDGETS.lcpMs);

  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value ?? 0;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 2_000);
      }),
  );
  expect(cls, `CLS ${cls.toFixed(3)}`).toBeLessThan(BUDGETS.cls);
});

test('stays inside its transfer budget', async ({ page }) => {
  let transferred = 0;
  page.on('response', (response) => {
    const length = Number(response.headers()['content-length'] ?? 0);
    if (Number.isFinite(length)) transferred += length;
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(transferred, `${Math.round(transferred / 1024)} KB transferred`).toBeLessThan(
    BUDGETS.transferBytes,
  );
});
