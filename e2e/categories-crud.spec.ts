import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { installMockCategoryApi } from './support/mock-category-api';

test('creates, filters, edits and deletes a category', async ({
  page,
}, testInfo) => {
  const mockApi = testInfo.project.name.startsWith('mock-');
  const name = `E2E category ${randomUUID()}`;
  const updatedName = `${name} updated`;
  let createdId: string | null = null;
  let deleted = false;

  try {
    if (mockApi) await installMockCategoryApi(page);
    await page.goto('/login');
    await page.getByLabel('Email').fill('personal@taler.local');
    await page
      .getByRole('textbox', { name: 'Пароль', exact: true })
      .fill('TalerPersonal2026!');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/categories');
    await page.getByRole('button', { name: 'Добавить категорию' }).click();
    const createForm = page.getByRole('dialog', { name: 'Новая категория' });
    await createForm.getByRole('textbox', { name: 'Название' }).fill(name);
    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/categories' &&
        response.request().method() === 'POST',
    );
    await createForm
      .getByRole('button', { name: 'Сохранить категорию' })
      .click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    createdId = ((await created.json()) as { id: string }).id;
    await expect(createForm).toHaveCount(0);

    const search = page.getByRole('textbox', { name: 'Поиск категорий' });
    await search.fill(name);
    await expect(page).toHaveURL(
      (url) => url.searchParams.get('search') === name,
    );
    const originalCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(originalCard).toBeVisible();
    await originalCard
      .getByRole('button', { name: `Изменить категорию ${name}` })
      .click();
    const editForm = page.getByRole('dialog', { name: 'Изменить категорию' });
    await editForm.getByRole('textbox', { name: 'Название' }).fill(updatedName);
    const updateResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/api/v1/categories/${createdId}` &&
        response.request().method() === 'PATCH',
    );
    await editForm.getByRole('button', { name: 'Сохранить категорию' }).click();
    expect((await updateResponse).status()).toBe(200);
    await expect(editForm).toHaveCount(0);

    await search.fill(updatedName);
    const updatedCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: updatedName, exact: true }),
    });
    await expect(updatedCard).toBeVisible();
    await updatedCard
      .getByRole('button', { name: `Удалить категорию ${updatedName}` })
      .click();
    const deleteDialog = page.getByRole('dialog', {
      name: 'Удалить категорию',
    });
    await expect(deleteDialog).toContainText(updatedName);
    const deleteResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/api/v1/categories/${createdId}` &&
        response.request().method() === 'DELETE',
    );
    await deleteDialog
      .getByRole('button', { name: 'Удалить окончательно' })
      .click();
    expect((await deleteResponse).status()).toBe(204);
    deleted = true;
    await expect(
      page.getByText('По вашему запросу категории не найдены.'),
    ).toBeVisible();
  } finally {
    if (createdId && !deleted && !mockApi) {
      const status = await page.evaluate(
        async (id) =>
          (
            await fetch(`/api/v1/categories/${id}`, {
              method: 'DELETE',
              credentials: 'include',
            })
          ).status,
        createdId,
      );
      expect([204, 404]).toContain(status);
    }
  }
});
