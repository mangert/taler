import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const month = '2026-09-01';
const timestamp = '2026-09-21T10:00:00.000Z';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill('personal@taler.local');
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill('TalerPersonal2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL('/');
}

async function installMockBudgetApi(
  page: Page,
  categoryId: string,
  categoryName: string,
): Promise<void> {
  const profile = {
    id: randomUUID(),
    email: 'personal@taler.local',
    displayName: 'Личный',
    baseCurrency: 'RUB',
    timeZone: 'Europe/Moscow',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const category = {
    id: categoryId,
    name: categoryName,
    icon: 'shopping_cart',
    color: '#2E7D32',
    type: 'EXPENSE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  let budgetId: string | null = null;
  let transactionId: string | null = null;
  let spent = 0;
  const budget = () => ({
    id: budgetId,
    categoryId,
    month,
    limitAmount: '100.0000',
    currency: 'RUB',
    spentAmount: spent.toFixed(4),
    remainingAmount: (100 - spent).toFixed(4),
    progressPercent: spent,
    isExceeded: spent > 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (path === '/api/v1/auth/me') {
      await route.fulfill({ json: profile });
      return;
    }
    if (path === '/api/v1/categories' && method === 'GET') {
      await route.fulfill({
        json: {
          items: [category],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        },
      });
      return;
    }
    if (path === '/api/v1/budgets' && method === 'GET') {
      const items =
        budgetId && url.searchParams.get('month') === month ? [budget()] : [];
      await route.fulfill({
        json: {
          items,
          meta: {
            page: 1,
            pageSize: 20,
            total: items.length,
            totalPages: items.length,
          },
        },
      });
      return;
    }
    if (path === '/api/v1/budgets' && method === 'POST') {
      budgetId = randomUUID();
      await route.fulfill({ status: 201, json: budget() });
      return;
    }
    if (path === '/api/v1/transactions' && method === 'GET') {
      await route.fulfill({
        json: {
          items: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        },
      });
      return;
    }
    if (path === '/api/v1/transactions' && method === 'POST') {
      const input = request.postDataJSON() as {
        categoryId: string;
        type: string;
        amount: string;
        currency: string;
        exchangeRateToBase: string;
        transactionDate: string;
        description: string | null;
      };
      transactionId = randomUUID();
      spent = Number(input.amount);
      await route.fulfill({
        status: 201,
        json: {
          ...input,
          id: transactionId,
          baseAmount: spent.toFixed(4),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
      return;
    }
    if (
      path === `/api/v1/transactions/${transactionId}` &&
      method === 'DELETE'
    ) {
      transactionId = null;
      spent = 0;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (path === `/api/v1/budgets/${budgetId}` && method === 'DELETE') {
      budgetId = null;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.abort();
  });
}

test('updates budget progress after creating an expense through the UI', async ({
  page,
}, testInfo) => {
  const mockApi = testInfo.project.name === 'mock-chromium';
  const categoryName = `Budget E2E ${randomUUID().slice(0, 8)}`;
  let categoryId: string | null = null;
  let budgetId: string | null = null;
  let transactionId: string | null = null;

  try {
    if (mockApi) {
      categoryId = randomUUID();
      await installMockBudgetApi(page, categoryId, categoryName);
    } else {
      await signIn(page);
      const response = await page.request.post('/api/v1/categories', {
        data: {
          name: categoryName,
          icon: 'shopping_cart',
          color: '#2E7D32',
          type: 'EXPENSE',
        },
      });
      expect(response.status()).toBe(201);
      categoryId = ((await response.json()) as { id: string }).id;
    }

    await page.goto(`/budgets?month=${month}`);
    await page.getByRole('button', { name: 'Добавить бюджет' }).click();
    const budgetForm = page.getByRole('dialog', { name: 'Новый бюджет' });
    await budgetForm
      .getByRole('combobox', { name: 'Категория расходов' })
      .click();
    await page.getByRole('option', { name: categoryName }).click();
    await budgetForm.getByRole('textbox', { name: 'Лимит' }).fill('100');
    const budgetResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/budgets' &&
        response.request().method() === 'POST',
    );
    await budgetForm.getByRole('button', { name: 'Сохранить бюджет' }).click();
    const createdBudget = await budgetResponse;
    expect(createdBudget.status()).toBe(201);
    expect(createdBudget.request().postDataJSON()).toMatchObject({
      categoryId,
      month,
      limitAmount: '100',
    });
    budgetId = ((await createdBudget.json()) as { id: string }).id;
    const card = page.locator('article').filter({ hasText: categoryName });
    await expect(card.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '0% от лимита',
    );

    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Добавить транзакцию' }).click();
    const transactionForm = page.getByRole('dialog', {
      name: 'Новая транзакция',
    });
    await transactionForm.getByRole('textbox', { name: 'Сумма' }).fill('40');
    await transactionForm.getByLabel('Дата транзакции').fill('2026-09-15');
    await transactionForm
      .getByRole('combobox', { name: 'Категория транзакции' })
      .click();
    await page.getByRole('option', { name: categoryName }).click();
    const transactionResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/transactions' &&
        response.request().method() === 'POST',
    );
    await transactionForm
      .getByRole('button', { name: 'Сохранить транзакцию' })
      .click();
    const createdTransaction = await transactionResponse;
    expect(createdTransaction.status()).toBe(201);
    expect(createdTransaction.request().postDataJSON()).toMatchObject({
      categoryId,
      type: 'EXPENSE',
      amount: '40',
      currency: 'RUB',
      transactionDate: '2026-09-15',
    });
    transactionId = ((await createdTransaction.json()) as { id: string }).id;

    await page.goto(`/budgets?month=${month}`);
    const updatedCard = page
      .locator('article')
      .filter({ hasText: categoryName });
    await expect(updatedCard.getByText(/Расход:.*40/)).toBeVisible();
    await expect(updatedCard.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '40% от лимита',
    );
  } finally {
    if (!mockApi) {
      if (transactionId) {
        const response = await page.request.delete(
          `/api/v1/transactions/${transactionId}`,
        );
        expect([204, 404]).toContain(response.status());
      }
      if (budgetId) {
        const response = await page.request.delete(
          `/api/v1/budgets/${budgetId}`,
        );
        expect([204, 404]).toContain(response.status());
      }
      if (categoryId) {
        const response = await page.request.delete(
          `/api/v1/categories/${categoryId}`,
        );
        expect([204, 404]).toContain(response.status());
      }
    }
  }
});
