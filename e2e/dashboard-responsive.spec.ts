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

const expensesByCategory = [
  {
    categoryId: 'groceries',
    categoryName:
      'Очень длинное название категории для проверки мобильной легенды',
    color: '#EF6C00',
    amount: '250.0000',
  },
  {
    categoryId: 'transport',
    categoryName: 'Транспорт',
    color: '#1565C0',
    amount: '150.0000',
  },
];

const dashboard = {
  currency: 'RUB',
  months: 6,
  fromMonth: '2026-04-01',
  toMonth: '2026-09-01',
  totals: { income: '2000.0000', expense: '400.0000', balance: '1600.0000' },
  expensesByCategory,
  monthlySeries: [
    { month: '2026-04-01', income: '300.0000', expense: '50.0000' },
    { month: '2026-05-01', income: '300.0000', expense: '60.0000' },
    { month: '2026-06-01', income: '300.0000', expense: '70.0000' },
    { month: '2026-07-01', income: '300.0000', expense: '80.0000' },
    { month: '2026-08-01', income: '300.0000', expense: '90.0000' },
    { month: '2026-09-01', income: '500.0000', expense: '50.0000' },
  ],
  topCategories: expensesByCategory,
};

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`lays out dashboard without clipping on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/auth/me') {
        await route.fulfill({ json: profile });
      } else if (path === '/api/v1/dashboard') {
        await route.fulfill({ json: dashboard });
      } else {
        await route.abort();
      }
    });

    await page.goto('/');
    const pie = page.getByRole('region', { name: 'Расходы по категориям' });
    const monthly = page.getByRole('region', { name: 'Динамика по месяцам' });
    await expect(pie).toBeVisible();
    await expect(monthly).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Легенда расходов по категориям' }),
    ).toContainText('Очень длинное название категории');
    await expect(
      page.getByRole('list', { name: 'Расходы по категориям текстом' }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Динамика по месяцам текстом' }),
    ).toBeVisible();

    const pieBox = await pie.boundingBox();
    const monthlyBox = await monthly.boundingBox();
    expect(pieBox).not.toBeNull();
    expect(monthlyBox).not.toBeNull();
    if (pieBox && monthlyBox) {
      if (viewport.name === 'mobile') {
        expect(monthlyBox.y).toBeGreaterThanOrEqual(pieBox.y + pieBox.height);
      } else {
        expect(Math.abs(monthlyBox.y - pieBox.y)).toBeLessThan(10);
      }
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);

    const pieGraphic = page.getByRole('img', {
      name: 'Круговая диаграмма расходов по категориям',
    });
    const lineGraphic = page.getByRole('img', {
      name: 'Линейный график доходов и расходов по месяцам',
    });
    expect((await pieGraphic.boundingBox())?.height).toBeLessThanOrEqual(280);
    expect((await lineGraphic.boundingBox())?.height).toBeLessThanOrEqual(300);

    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${viewport.name}.png`),
      fullPage: true,
    });

    await page.locator('.recharts-sector').first().hover();
    const tooltip = pie.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Очень длинное название категории');
    await expect(tooltip).toContainText('250,00 RUB');
    const tooltipBox = await tooltip.boundingBox();
    expect(tooltipBox).not.toBeNull();
    if (tooltipBox) {
      expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(
        viewport.width,
      );
    }
    await page.locator('.recharts-dot').first().hover();
    const lineTooltip = monthly.locator('.recharts-tooltip-wrapper');
    await expect(lineTooltip).toBeVisible();
    await expect(lineTooltip).toContainText('Доходы');
    await expect(lineTooltip).toContainText('Расходы');
    await expect(lineTooltip).toContainText('RUB');
    const lineTooltipBox = await lineTooltip.boundingBox();
    expect(lineTooltipBox).not.toBeNull();
    if (lineTooltipBox) {
      expect(lineTooltipBox.x).toBeGreaterThanOrEqual(0);
      expect(lineTooltipBox.x + lineTooltipBox.width).toBeLessThanOrEqual(
        viewport.width,
      );
    }
    expect(consoleErrors).toEqual([]);
  });
}
