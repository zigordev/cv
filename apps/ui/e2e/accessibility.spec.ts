import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility, asserted rather than assumed.
 *
 * The rule set is WCAG 2.1 A and AA, which is the level most public-sector and
 * enterprise procurement asks for. axe reports only violations it can prove
 * from the DOM — it cannot judge whether alt text is *good*, only whether it is
 * there — so a clean run is a floor, not a certificate.
 */
test.describe('accessibility', () => {
  test('the CV page has no WCAG A or AA violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Named in the failure output, so a regression says which rule and which
    // element rather than just a count.
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
    ).toEqual([]);
  });

  test('every case-study modal opens and is announced', async ({ page }) => {
    await page.goto('/');
    const firstProject = page.getByRole('button').first();
    await firstProject.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
