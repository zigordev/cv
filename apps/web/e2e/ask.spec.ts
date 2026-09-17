import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The question box, end to end, with the model replaced by the test.
 *
 * Every /api/ask request is fulfilled by page.route, so what is asserted is the
 * contract between the panel and the route — the shapes the server sends and
 * what the reader sees for each — plus the one interaction that justifies the
 * feature: a cited source is a link into the CV, not a quote.
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

async function openBox(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ask this CV' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('the question box', () => {
  test('opens from the header and is accessible with the dialog open', async ({ page }) => {
    const dialog = await openBox(page);

    await expect(dialog.locator(':focus')).toHaveCount(1);
    await expect(
      dialog.getByRole('button', { name: 'Where has Kafka been used in production?' })
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`)).toEqual(
      []
    );
  });

  test('shows the answer and opens the cited case study on the right tab', async ({ page }) => {
    const questions: string[] = [];
    await answerWith(page, async (route) => {
      questions.push(JSON.parse(route.request().postData() ?? '{}').question);
      await route.fulfill({ json: ANSWERED });
    });
    const dialog = await openBox(page);

    await dialog.getByRole('button', { name: 'Where has Kafka been used in production?' }).click();

    await expect(dialog.getByText(ANSWERED.answer)).toBeVisible();
    expect(questions).toEqual(['Where has Kafka been used in production?']);

    await dialog.getByRole('button', { name: 'gpool · Decisions' }).click();

    await expect(dialog).toBeHidden();
    const caseStudy = page.getByRole('dialog', { name: 'gpool' });
    await expect(caseStudy).toBeVisible();
    await expect(caseStudy.getByRole('tab', { name: 'Architecture' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(caseStudy.getByText('Decisions worth defending')).toBeVisible();
  });

  test('submits a typed question with Enter and scrolls to a cited section', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill({ json: ANSWERED }));
    const dialog = await openBox(page);

    await dialog.getByLabel('Your question').fill('Has he run Kafka in production?');
    await dialog.getByLabel('Your question').press('Enter');

    await expect(dialog.getByText('You asked')).toBeVisible();
    await expect(dialog.getByText('Has he run Kafka in production?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Experience · DEHN' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('#experience')).toBeInViewport();
  });

  test('renders a refusal as an answer, with the contact form one click away', async ({ page }) => {
    await answerWith(page, (route) =>
      route.fulfill({ json: { outcome: 'refused', refusal: 'contact' } })
    );
    const dialog = await openBox(page);

    await dialog.getByLabel('Your question').fill('What is his email?');
    await dialog.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(dialog.getByText('No contact details are published on this site.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Send a message' }).click();

    await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
  });

  test('rests for the month when the budget is spent, keeping the question', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill(problem(429, 'ASK.BUDGET_EXHAUSTED')));
    const dialog = await openBox(page);

    await dialog.getByLabel('Your question').fill('Which projects use Terraform?');
    await dialog.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(dialog.getByRole('status')).toContainText('used its budget for this month');
    await expect(dialog.getByLabel('Your question')).toBeDisabled();
    await expect(dialog.getByLabel('Your question')).toHaveValue('Which projects use Terraform?');
    await expect(dialog.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  });

  test('keeps the question in the box when the answer fails', async ({ page }) => {
    await answerWith(page, (route) => route.fulfill(problem(502, 'ASK.UPSTREAM_FAILED')));
    const dialog = await openBox(page);

    await dialog.getByLabel('Your question').fill('Why Rust?');
    await dialog.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(dialog.getByRole('alert')).toContainText('did not come through');
    await expect(dialog.getByLabel('Your question')).toHaveValue('Why Rust?');
    await expect(dialog.getByLabel('Your question')).toBeEnabled();
  });

  test('leaves no trace when printing', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('button', { name: 'Ask' })).toBeHidden();
  });
});
