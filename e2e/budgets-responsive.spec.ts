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
  { id: '20000000-0000-4000-8000-000000000001', name: 'Продукты' },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Путешествия и неожиданные покупки для дома',
  },
  { id: '20000000-0000-4000-8000-000000000003', name: 'Транспорт' },
].map((category) => ({
  ...category,
  icon: 'category',
  color: '#2E7D32',
  type: 'EXPENSE',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
}));

const amounts = [
  {
    spentAmount: '125.0000',
    remainingAmount: '375.0000',
    progressPercent: 25,
    isExceeded: false,
  },
  {
    spentAmount: '500000000.0000',
    remainingAmount: '-499999500.0000',
    progressPercent: 100000000,
    isExceeded: true,
  },
  {
    spentAmount: '0.0000',
    remainingAmount: '500.0000',
    progressPercent: 0,
    isExceeded: false,
  },
];
const budgets = categories.map((category, index) => ({
  id: `30000000-0000-4000-8000-00000000000${index + 1}`,
  categoryId: category.id,
  month: '2026-09-01',
  limitAmount: '500.0000',
  currency: 'RUB',
  ...amounts[index],
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/me') await route.fulfill({ json: profile });
    else if (path === '/api/v1/categories')
      await route.fulfill({
        json: {
          items: categories,
          meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
        },
      });
    else if (path === '/api/v1/budgets')
      await route.fulfill({
        json: {
          items: budgets,
          meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
        },
      });
    else await route.abort();
  });
});

test('keeps equal-height desktop cards and a single mobile column without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/budgets?month=2026-09-01');
  const cards = page.locator('article');
  await expect(cards).toHaveCount(3);
  await expect(
    page.getByText('В этом месяце расходов пока нет.'),
  ).toBeVisible();
  await expect(
    page.getByText(/100000000% от лимита — лимит превышен/),
  ).toBeVisible();
  await expect(
    page.getByText(/100000000% от лимита — лимит превышен/),
  ).toHaveCSS('color', /rgb\(211,\s*47,\s*47\)/);
  const progress = page.getByRole('progressbar', {
    name: 'Прогресс бюджета Путешествия и неожиданные покупки для дома',
  });
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  await expect(progress).toHaveAttribute(
    'aria-valuetext',
    '100000000% от лимита — лимит превышен',
  );
  const desktop = await Promise.all(
    [0, 1, 2].map((index) => cards.nth(index).boundingBox()),
  );
  expect(desktop.every((box) => box !== null)).toBe(true);
  expect(desktop[0]?.y).toBe(desktop[1]?.y);
  expect(desktop[1]?.y).toBe(desktop[2]?.y);
  expect(
    Math.abs((desktop[0]?.height ?? 0) - (desktop[1]?.height ?? 0)),
  ).toBeLessThan(1);
  expect(
    Math.abs((desktop[1]?.height ?? 0) - (desktop[2]?.height ?? 0)),
  ).toBeLessThan(1);
  await page.screenshot({
    path: testInfo.outputPath('desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await Promise.all(
    [0, 1, 2].map((index) => cards.nth(index).boundingBox()),
  );
  expect(mobile[0]?.y).toBeLessThan(mobile[1]?.y ?? 0);
  expect(mobile[1]?.y).toBeLessThan(mobile[2]?.y ?? 0);
  expect(mobile[0]?.x).toBe(mobile[1]?.x);
  expect(mobile[1]?.x).toBe(mobile[2]?.x);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
  });
});
