import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { installMockTransactionApi } from './support/mock-transaction-api';

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
  test(`creates, filters, edits and deletes a transaction on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const mockApi = testInfo.project.name === 'mock-chromium';
    const description = `E2E transaction ${randomUUID()}`;
    let createdId: string | null = null;
    let deleted = false;

    try {
      if (mockApi) await installMockTransactionApi(page);
      await signIn(page);
      await page.goto('/transactions');
      await expect(
        page.getByRole('heading', { name: 'Транзакции' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Добавить транзакцию' }).click();
      const form = page.getByRole('dialog', { name: 'Новая транзакция' });
      await expect(form).toBeVisible();
      await form.getByRole('textbox', { name: 'Сумма' }).fill('23.50');
      await form.getByLabel('Дата транзакции').fill('2026-09-21');
      await form.getByRole('textbox', { name: 'Описание' }).fill(description);
      await form
        .getByRole('combobox', { name: 'Категория транзакции' })
        .click();
      await page.getByRole('option', { name: 'Продукты' }).click();
      const createdResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/v1/transactions' &&
          response.request().method() === 'POST',
      );
      await form.getByRole('button', { name: 'Сохранить транзакцию' }).click();
      const created = await createdResponse;
      expect(created.status()).toBe(201);
      createdId = ((await created.json()) as { id: string }).id;
      await expect(form).toHaveCount(0);

      if (viewport.name === 'mobile') {
        await page
          .getByRole('button', { name: 'Дополнительные фильтры' })
          .click();
      }
      await page
        .getByRole('textbox', { name: 'Поиск по описанию' })
        .fill(description);
      if (viewport.name === 'mobile') {
        await page.getByRole('button', { name: 'Закрыть фильтры' }).click();
      }
      await expect(page).toHaveURL(
        (url) => url.searchParams.get('search') === description,
      );
      const list =
        viewport.name === 'mobile'
          ? page.getByRole('list', { name: 'Карточки транзакций' })
          : page.getByRole('table', { name: 'Транзакции' });
      await expect(list.getByText(description)).toBeVisible();

      await page
        .getByRole('button', { name: `Изменить транзакцию ${description}` })
        .click();
      const editForm = page.getByRole('dialog', {
        name: 'Изменить транзакцию',
      });
      await editForm.getByRole('textbox', { name: 'Сумма' }).fill('44.75');
      const updatedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/v1/transactions/${createdId}` &&
          response.request().method() === 'PATCH',
      );
      await editForm
        .getByRole('button', { name: 'Сохранить транзакцию' })
        .click();
      expect((await updatedResponse).status()).toBe(200);
      await expect(editForm).toHaveCount(0);
      await expect(list.getByText(/44,75/)).toBeVisible();

      await page.goto('/audit-log?action=UPDATE&entityType=TRANSACTION');
      await expect(
        page.getByRole('heading', { name: 'Журнал изменений' }),
      ).toBeVisible();
      const journalEntry =
        viewport.name === 'mobile'
          ? page
              .getByRole('list', { name: 'Карточки изменений' })
              .getByRole('listitem')
              .filter({ hasText: description })
          : page
              .getByRole('table', { name: 'Журнал изменений' })
              .getByRole('row')
              .filter({ hasText: description });
      await expect(journalEntry).toContainText('Изменение');

      await page.goto(
        `/transactions?search=${encodeURIComponent(description)}`,
      );
      await expect(list.getByText(description)).toBeVisible();
      await page
        .getByRole('button', { name: `Удалить транзакцию ${description}` })
        .click();
      const deleteDialog = page.getByRole('dialog', {
        name: 'Удалить транзакцию',
      });
      await expect(deleteDialog).toBeVisible();
      const deletedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/v1/transactions/${createdId}` &&
          response.request().method() === 'DELETE',
      );
      await deleteDialog
        .getByRole('button', { name: 'Удалить окончательно' })
        .click();
      expect((await deletedResponse).status()).toBe(204);
      deleted = true;
      await expect(
        page.getByText('По вашим фильтрам транзакции не найдены.'),
      ).toBeVisible();
      if (viewport.name === 'mobile') {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
      }
    } finally {
      if (createdId && !deleted && !mockApi) {
        const response = await page.request.delete(
          `/api/v1/transactions/${createdId}`,
        );
        expect([204, 404]).toContain(response.status());
      }
    }
  });
}
