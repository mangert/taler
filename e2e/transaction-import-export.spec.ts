import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { parse } from 'csv-parse/sync';

const isolatedApiUrl = process.env.TALER_TEST_API_URL;

async function routeIsolatedApi(page: Page): Promise<void> {
  if (!isolatedApiUrl) return;
  await page.route('**/api/v1/**', async (route) => {
    const incoming = new URL(route.request().url());
    const target = new URL(
      `${incoming.pathname}${incoming.search}`,
      isolatedApiUrl,
    );
    const response = await route.fetch({ url: target.toString() });
    await route.fulfill({ response });
  });
}

async function removeImportedRows(page: Page, marker: string): Promise<void> {
  const ids = await page.evaluate(async (search) => {
    const response = await fetch(
      `/api/v1/transactions?search=${encodeURIComponent(search)}&pageSize=100`,
      { credentials: 'include' },
    );
    if (!response.ok)
      throw new Error(`Cleanup list failed: ${response.status}`);
    const body = (await response.json()) as {
      items: { id: string; description: string | null }[];
    };
    return body.items
      .filter((item) => item.description?.includes(search))
      .map((item) => item.id);
  }, marker);
  for (const id of ids) {
    const status = await page.evaluate(
      async (transactionId) =>
        (
          await fetch(`/api/v1/transactions/${transactionId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        ).status,
      id,
    );
    expect(status).toBe(204);
  }
}

test('imports a fixture CSV and exports only the filtered rows', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith('mock-') && !isolatedApiUrl,
    'A real seeded API is required for the import/export journey',
  );
  const marker = `CSV-E2E-${randomUUID()}`;
  const fixture = await readFile(
    resolve('e2e/fixtures/transaction-import.csv'),
    'utf8',
  );
  const contents = fixture.replaceAll('__E2E_MARKER__', marker);
  await routeIsolatedApi(page);

  await page.goto('/login');
  await page.getByLabel('Email').fill('personal@taler.local');
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill('TalerPersonal2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL('/');

  try {
    await page.goto('/transaction-imports');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'transaction-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(contents),
    });
    await expect(
      page.getByRole('form', { name: 'Сопоставление колонок' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Предпросмотр' }).click();
    await expect(
      page.getByRole('heading', { name: 'Предварительный просмотр' }),
    ).toBeVisible();

    const importResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/transaction-imports' &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Импортировать' }).click();
    expect((await importResponse).status()).toBe(201);
    await expect(page.getByText('Импортировано транзакций: 2')).toBeVisible();

    const filters = new URLSearchParams({
      search: marker,
      dateFrom: '2026-09-21',
      dateTo: '2026-09-22',
      minAmount: '7',
      maxAmount: '13',
      type: 'EXPENSE',
    });
    await page.goto(`/transactions?${filters.toString()}`);
    const list = testInfo.project.name.endsWith('mobile')
      ? page.getByRole('list', { name: 'Карточки транзакций' })
      : page.getByRole('table', { name: 'Транзакции' });
    await expect(list.getByText(`${marker} Coffee`)).toBeVisible();
    await expect(list.getByText(`${marker} Tea`)).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/transactions/export' &&
        response.request().method() === 'GET',
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Экспорт CSV' }).click();
    const exportResponse = await responsePromise;
    expect(exportResponse.status()).toBe(200);
    const exportUrl = new URL(exportResponse.url());
    for (const [key, value] of filters) {
      expect(exportUrl.searchParams.get(key)).toBe(value);
    }
    expect(exportUrl.searchParams.has('page')).toBe(false);
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('transactions.csv');
    const path = await download.path();
    if (!path) throw new Error('Downloaded CSV path is unavailable');
    const rows = parse(await readFile(path, 'utf8'), {
      bom: true,
      columns: true,
    }) as { description: string; type: string; amount: string }[];
    expect(rows.map((row) => row.description).sort()).toEqual(
      [`${marker} Coffee`, `${marker} Tea`].sort(),
    );
    expect(rows.map((row) => row.amount).sort()).toEqual(['12.5000', '7.2500']);
    expect(rows.every((row) => row.type === 'EXPENSE')).toBe(true);
  } finally {
    await removeImportedRows(page, marker);
  }
});
