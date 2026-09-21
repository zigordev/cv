import { expect, test } from '@playwright/test';

test('a page render reaches /metrics, along with the release', async ({ page, request }) => {
  await page.goto('/');

  const text = await (await request.get('/metrics')).text();

  expect(text).toMatch(/^cv_i18n_messages_total\{source="[a-z_]+"\} [1-9]/m);
  expect(text).toMatch(/^cv_feature_flag_enabled\{flag="cv-ask"\} 1$/m);
  expect(text).toMatch(/^service_build_info\{version="[^"]+"\} 1$/m);
});
