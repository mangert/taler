import { expect, test } from '@playwright/test';

test('shows the Taler application identity', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Taler' })).toBeVisible();
  await expect(page.getByText('Трекер личных финансов')).toBeVisible();
});
