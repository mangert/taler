import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill('personal@taler.local');
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill('TalerPersonal2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL('/');
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`creates and displays a recurring rule on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith(viewport.name));
    await page.setViewportSize(viewport);
    const description = `E2E recurring ${randomUUID()}`;
    const startDate = `${new Date().getUTCFullYear() + 2}-02-01`;
    let createdId: string | null = null;
    let deleted = false;

    try {
      await signIn(page);
      await page.goto('/recurring-transactions');
      await expect(
        page.getByRole('heading', { name: 'Повторяющиеся транзакции' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Добавить правило' }).click();
      const form = page.getByRole('dialog', { name: 'Новое правило' });
      await expect(form).toBeVisible();
      await form.getByRole('combobox', { name: 'Категория' }).click();
      await page.getByRole('option', { name: 'Продукты' }).click();
      await form.getByRole('textbox', { name: 'Сумма' }).fill('23.50');
      await form.getByRole('textbox', { name: 'День месяца' }).fill('31');
      await form.getByLabel('Дата начала').fill(startDate);
      await form.getByRole('textbox', { name: 'Описание' }).fill(description);

      const createdResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            '/api/v1/recurring-transactions' &&
          response.request().method() === 'POST',
      );
      await form.getByRole('button', { name: 'Сохранить правило' }).click();
      const created = await createdResponse;
      expect(created.status()).toBe(201);
      createdId = ((await created.json()) as { id: string }).id;
      await expect(form).toHaveCount(0);

      const record =
        viewport.name === 'desktop'
          ? page
              .getByRole('table', { name: 'Повторяющиеся правила' })
              .getByRole('row')
              .filter({ hasText: description })
          : page.getByRole('article').filter({ hasText: description });
      await expect(record).toBeVisible();
      await expect(record).toContainText('Продукты');
      await expect(record).toContainText('23.5000 RUB');
      await expect(record).toContainText('Каждый месяц 31-го числа');
      await expect(record).toContainText('Активно');
      if (viewport.name === 'mobile') {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
      }
      await record
        .getByRole('button', { name: 'Удалить правило Продукты' })
        .click();
      const deleteDialog = page.getByRole('dialog', {
        name: 'Удалить правило',
      });
      await expect(deleteDialog).toBeVisible();
      const deletedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/v1/recurring-transactions/${createdId}` &&
          response.request().method() === 'DELETE',
      );
      await deleteDialog
        .getByRole('button', { name: 'Удалить окончательно' })
        .click();
      expect((await deletedResponse).status()).toBe(204);
      deleted = true;
      await expect(record).toHaveCount(0);
    } finally {
      if (createdId && !deleted) {
        const status = await page.evaluate(async (id) => {
          const response = await fetch(`/api/v1/recurring-transactions/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          return response.status;
        }, createdId);
        expect([204, 404]).toContain(status);
      }
    }
  });
}
