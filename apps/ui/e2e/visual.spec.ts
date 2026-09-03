import { expect, test } from '@playwright/test';

/**
 * Visual regression against the vendored design system.
 *
 * The design system is copy-pasted into each app, so a token change lands here
 * by a sync rather than by a version bump — which means nothing currently
 * notices when a colour, a radius or a type scale shifts. These snapshots do.
 *
 * They are deliberately few and structural. A screenshot per component is a
 * suite nobody maintains; three views that exercise the tokens catch the
 * regressions that matter and stay reviewable in a pull request.
 */

test.describe('visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Fonts and images settle after load; without this the first run and the
    // comparison run differ by a font swap rather than by a real change.
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
  });

  test('the page renders as expected', async ({ page }) => {
    await expect(page).toHaveScreenshot('cv-page.png', {
      fullPage: true,
      // Anti-aliasing differs slightly between machines; this tolerates that
      // without tolerating an actual colour or layout change.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('a case-study modal renders as expected', async ({ page }) => {
    await page.getByRole('button').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot('cv-modal.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('renders as expected on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('cv-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
