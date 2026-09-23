import { expect, test } from '@playwright/test';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const categories = [
  {
    id: 'category-1',
    name: 'Продукты',
    icon: 'shopping_cart',
    color: '#EF6C00',
    type: 'EXPENSE',
  },
  {
    id: 'category-2',
    name: 'Дом',
    icon: 'home',
    color: '#1565C0',
    type: 'EXPENSE',
  },
  {
    id: 'category-3',
    name: 'Подарки',
    icon: 'redeem',
    color: '#2E7D32',
    type: 'INCOME',
  },
].map((category) => ({
  ...category,
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/me') {
      await route.fulfill({ json: profile });
    } else if (path === '/api/v1/categories') {
      await route.fulfill({
        json: {
          items: categories,
          meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
        },
      });
    } else {
      await route.abort();
    }
  });
});

test('keeps category names and icons visible in desktop and mobile grids', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/categories');
  const cards = page.locator('article');
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Продукты' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Иконка категории Продукты' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Иконка категории Продукты' }),
  ).toHaveCSS('background-color', 'rgb(239, 108, 0)');
  await expect(
    page.getByRole('img', { name: 'Иконка категории Продукты' }),
  ).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(
    page.getByRole('img', { name: 'Иконка категории Дом' }),
  ).toHaveCSS('color', 'rgb(255, 255, 255)');

  const desktop = await Promise.all(
    [0, 1, 2].map((index) => cards.nth(index).boundingBox()),
  );
  expect(desktop.every((box) => box !== null)).toBe(true);
  expect(desktop[0]?.y).toBe(desktop[1]?.y);
  expect(desktop[1]?.y).toBe(desktop[2]?.y);

  await page.setViewportSize({ width: 800, height: 900 });
  const tablet = await Promise.all(
    [0, 1, 2].map((index) => cards.nth(index).boundingBox()),
  );
  expect(tablet[0]?.y).toBe(tablet[1]?.y);
  expect(tablet[1]?.y).toBeLessThan(tablet[2]?.y ?? 0);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await Promise.all(
    [0, 1, 2].map((index) => cards.nth(index).boundingBox()),
  );
  expect(mobile[0]?.y).toBeLessThan(mobile[1]?.y ?? 0);
  expect(mobile[1]?.y).toBeLessThan(mobile[2]?.y ?? 0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test('opens the category form across the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/categories');
  await page.getByRole('button', { name: 'Добавить категорию' }).click();
  const dialog = page.getByRole('dialog', { name: 'Новая категория' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds?.x).toBeLessThanOrEqual(1);
  expect(bounds?.y).toBeLessThanOrEqual(1);
  expect(bounds?.width).toBeGreaterThanOrEqual(389);
  expect(bounds?.height).toBeGreaterThanOrEqual(843);
  await expect(
    dialog.getByRole('button', { name: 'Сохранить категорию' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(async () => (await dialog.boundingBox())?.x ?? 0)
    .toBeGreaterThan(1);
  await expect
    .poll(async () => (await dialog.boundingBox())?.width ?? 0)
    .toBeLessThan(700);
});
