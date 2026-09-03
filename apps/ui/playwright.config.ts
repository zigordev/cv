import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end and accessibility checks for cv — the pilot for the estate.
 *
 * cv is the right place to start: it is the smallest surface, it is public, and
 * it is the one product whose whole purpose is being read by someone else. If
 * the budgets and the axe rules turn out to be workable here, they move to the
 * other three UIs.
 *
 * The server is started by Playwright itself rather than assumed, so `npm run
 * e2e` works on a clean checkout and in CI without a separate compose step.
 */
export default defineConfig({
  testDir: './e2e',
  // A failing accessibility assertion is a real failure; a flaky one is worse
  // than none, so retries exist in CI only, where the machine is noisy.
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3199',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start -- --port 3199',
    url: 'http://127.0.0.1:3199/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
