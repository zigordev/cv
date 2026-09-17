import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The question box, end to end, with the model replaced by the test.
 *
 * Every /api/ask request is fulfilled by page.route, so what is asserted is the
 * contract between the surfaces and the route — the shapes the server sends
 * and what the reader sees for each — plus the one interaction that justifies
 * the feature: a cited source is a link into the CV, not a quote.
 *
 * On a desktop viewport the box is the search bar in the header; below 900px
 * it is an icon that opens a dialog. Both share one conversation.
 */
const ANSWERED = {
  outcome: 'answered',
  answer: 'Kafka carries every contact message and every pool event.',
  sources: [
    { label: 'gpool · Decisions', target: { type: 'project', id: 'gpool', tab: 'architecture' } },
    { label: 'Experience · DEHN', target: { type: 'section', id: 'experience' } },
  ],
};

const problem = (status: number, code: string) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ status, code, instance: '/api/ask' }),
});

async function answerWith(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/ask', handler);
}

const bar = (page: Page) => page.getByRole('combobox', { name: 'Your question' });
const panel = (page: Page) => page.getByRole('dialog', { name: 'Ask this CV' });

test.describe('the question bar', () => {
  test('types the suggested questions into its placeholder', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.cv-ask-ghost')).toContainText('Where has Kafka', {
      timeout: 8_000,
    });
  });

  test('offers the suggestions on focus and is accessible with them open', async ({ page }) => {
    await page.goto('/');
    await bar(page).focus();

    const listbox = page.getByRole('listbox', { name: 'Try asking' });
    await expect(listbox).toBeVisible();
    await expect(
      listbox.getByRole('option', { name: 'Where has Kafka been used in production?' })
    ).toBeVisible();
    await expect(bar(page)).toHaveAttribute('aria-expanded', 'true');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`)).toEqual(
      []
    );
  });

  test('answers a picked suggestion and opens the cited case study on the right tab', async ({
    page,
  }) => {
    const questions: string[] = [];
    await answerWith(page, async (route) => {
      questions.push(JSON.parse(route.request().postData() ?? '{}').question);
      await route.fulfill({ json: ANSWERED });
    });
    await page.goto('/');
    await bar(page).focus();

    await page.getByRole('option', { name: 'Where has Kafka been used in production?' }).click();

    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByText(ANSWERED.answer)).toBeVisible();
    expect(questions).toEqual(['Where has Kafka been used in production?']);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await panel(page).getByRole('button', { name: 'gpool · Decisions' }).click();

    await expect(panel(page)).toBeHidden();
    const caseStudy = page.getByRole('dialog', { name: 'gpool' });
    await expect(caseStudy).toBeVisible();
    await expect(caseStudy.getByRole('tab', { name: 'Architecture' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(caseStudy.getByText('Decisions worth defending')).toBeVisible();
  });

  test('walks the suggestions with the arrow keys', async ({ page }) => {
    const questions: string[] = [];
    await answerWith(page, async (route) => {
      questions.push(JSON.parse(route.request().postData() ?? '{}').question);
      await route.fulfill({ json: ANSWERED });
    });
    await page.goto('/');
    await bar(page).focus();

    await bar(page).press('ArrowDown');
    await bar(page).press('ArrowDown');
    await expect(
      page.getByRole('option', { name: 'Why Rust in the trading bot?' })
    ).toHaveAttribute('aria-selected', 'true');
    await bar(page).press('Enter');

    await expect(panel(page).getByText('Why Rust in the trading bot?')).toBeVisible();
    expect(questions).toEqual(['Why Rust in the trading bot?']);
  });

  test('submits a typed question with Enter and scrolls to a cited section', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill({ json: ANSWERED }));
    await page.goto('/');

    await bar(page).fill('Has he run Kafka in production?');
    await bar(page).press('Enter');

    await expect(panel(page).getByText('You asked')).toBeVisible();
    await expect(panel(page).getByText('Has he run Kafka in production?')).toBeVisible();
    await expect(bar(page)).toHaveValue('');
    await panel(page).getByRole('button', { name: 'Experience · DEHN' }).click();

    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#experience')).toBeInViewport();
  });

  test('shows that it is reading while the answer is on its way', async ({ page }) => {
    await answerWith(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.fulfill({ json: ANSWERED });
    });
    await page.goto('/');

    await bar(page).fill('Why Rust?');
    await bar(page).press('Enter');

    await expect(panel(page).locator('.cv-ask-thinking')).toBeVisible();
    await expect(page.locator('.cv-ask-bar')).toHaveAttribute('data-pending', 'true');
    await expect(panel(page).getByText('Reading the CV…').first()).toBeAttached();

    await expect(panel(page).getByText(ANSWERED.answer)).toBeVisible();
    await expect(panel(page).locator('.cv-ask-thinking')).toHaveCount(0);
    await expect(page.locator('.cv-ask-bar')).toHaveAttribute('data-pending', 'false');
  });

  test('closes with Escape and comes back with the transcript', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill({ json: ANSWERED }));
    await page.goto('/');
    await bar(page).fill('Why Rust?');
    await bar(page).press('Enter');
    await expect(panel(page)).toBeVisible();

    await bar(page).press('Escape');
    await expect(panel(page)).toBeHidden();

    await bar(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByText('Why Rust?')).toBeVisible();
  });

  test('renders a refusal as an answer, with the contact form one click away', async ({ page }) => {
    await answerWith(page, (route) =>
      route.fulfill({ json: { outcome: 'refused', refusal: 'contact' } })
    );
    await page.goto('/');

    await bar(page).fill('What is his email?');
    await bar(page).press('Enter');

    await expect(
      panel(page).getByText('No contact details are published on this site.')
    ).toBeVisible();
    await panel(page).getByRole('button', { name: 'Send a message' }).click();

    await expect(panel(page)).toBeHidden();
    await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
  });

  test('rests for the month when the budget is spent, keeping the question', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill(problem(429, 'ASK.BUDGET_EXHAUSTED')));
    await page.goto('/');

    await bar(page).fill('Which projects use Terraform?');
    await bar(page).press('Enter');

    await expect(panel(page).getByRole('status')).toContainText('used its budget for this month');
    await expect(bar(page)).toBeDisabled();
    await expect(bar(page)).toHaveValue('Which projects use Terraform?');
  });

  test('keeps the question in the bar when the answer fails', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill(problem(502, 'ASK.UPSTREAM_FAILED')));
    await page.goto('/');

    await bar(page).fill('Why Rust?');
    await bar(page).press('Enter');

    await expect(panel(page).getByRole('alert')).toContainText('did not come through');
    await expect(bar(page)).toHaveValue('Why Rust?');
    await expect(bar(page)).toBeEnabled();
  });

  test('leaves no trace when printing', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });

    await expect(bar(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeHidden();
  });
});

test.describe('the question box on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('is an icon that opens a dialog, sharing the same answers', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill({ json: ANSWERED }));
    await page.goto('/');

    await expect(bar(page)).toBeHidden();
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Ask this CV' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Where has Kafka been used in production?' }).click();
    await expect(dialog.getByText(ANSWERED.answer)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
