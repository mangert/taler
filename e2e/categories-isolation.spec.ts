import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL('/');
}

test('a created category is visible only in its owner account', async ({
  browser,
  page,
}) => {
  const name = `E2E категория ${randomUUID()}`;
  const familyContext = await browser.newContext();
  const familyPage = await familyContext.newPage();
  let creationAttempted = false;

  try {
    await signIn(page, 'personal@taler.local', 'TalerPersonal2026!');
    await page.goto('/categories');
    await page.getByRole('button', { name: 'Добавить категорию' }).click();
    await page.getByRole('textbox', { name: 'Название' }).fill(name);
    creationAttempted = true;
    await page.getByRole('button', { name: 'Сохранить категорию' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();

    await signIn(familyPage, 'family@taler.local', 'TalerFamily2026!');
    await familyPage.goto(`/categories?search=${encodeURIComponent(name)}`);
    await expect(
      familyPage.getByText('По вашему запросу категории не найдены.'),
    ).toBeVisible();
    await expect(familyPage.getByRole('heading', { name })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  } finally {
    try {
      if (creationAttempted) {
        await page.goto(`/categories?search=${encodeURIComponent(name)}`);
        const deleteButton = page.getByRole('button', {
          name: `Удалить категорию ${name}`,
        });
        await deleteButton
          .waitFor({ state: 'visible', timeout: 5_000 })
          .catch(() => undefined);
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page
            .getByRole('button', { name: 'Удалить окончательно' })
            .click();
          await expect(deleteButton).toHaveCount(0);
        }
      }
    } finally {
      await familyContext.close();
    }
  }
});
