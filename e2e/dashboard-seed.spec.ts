import { expect, test } from '@playwright/test';

const isolatedApiUrl = process.env.TALER_TEST_API_URL;

for (const scenario of [
  {
    name: 'desktop',
    width: 1280,
    height: 800,
    email: 'personal@taler.local',
    password: 'TalerPersonal2026!',
    category: 'Продукты',
    otherCategory: 'Супермаркет',
    currency: 'RUB',
  },
  {
    name: 'mobile',
    width: 390,
    height: 844,
    email: 'family@taler.local',
    password: 'TalerFamily2026!',
    category: 'Супермаркет',
    otherCategory: 'Продукты',
    currency: 'EUR',
  },
] as const) {
  test(`renders the seeded dashboard on ${scenario.name} without overflow or console errors`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith(scenario.name));
    test.skip(
      testInfo.project.name.startsWith('mock-') && !isolatedApiUrl,
      'Real seeded API is required for this scenario',
    );
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    if (isolatedApiUrl) {
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

    await page.goto('/login');
    await page.getByLabel('Email').fill(scenario.email);
    await page
      .getByRole('textbox', { name: 'Пароль', exact: true })
      .fill(scenario.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL('/');
    // An anonymous /auth/me check returns 401 on the login page by design.
    errors.length = 0;

    const summary = page.getByRole('region', { name: 'Текстовая сводка' });
    const categoryLegend = page.getByRole('list', {
      name: 'Легенда расходов по категориям',
    });
    const monthList = page.getByRole('list', {
      name: 'Динамика по месяцам текстом',
    });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(scenario.currency);
    await expect(categoryLegend).toContainText(scenario.category);
    await expect(categoryLegend).not.toContainText(scenario.otherCategory);
    await expect(monthList.getByRole('listitem')).toHaveCount(6);
    await expect(
      page.getByRole('region', { name: 'Топ категорий' }),
    ).toContainText(scenario.category);

    const monthlyChart = page.getByRole('region', {
      name: 'Динамика по месяцам',
    });
    const chartBox = await monthlyChart
      .getByRole('img', {
        name: 'Линейный график доходов и расходов по месяцам',
      })
      .boundingBox();
    expect(chartBox).not.toBeNull();
    const yAxisTickLocator = monthlyChart
      .locator('text.recharts-cartesian-axis-tick-value')
      .filter({ hasText: /^\d/ });
    await expect(yAxisTickLocator.first()).toBeVisible();
    const yAxisLabels = await yAxisTickLocator.all();
    expect(yAxisLabels.length).toBeGreaterThan(0);
    if (chartBox) {
      for (const label of yAxisLabels) {
        const labelBox = await label.boundingBox();
        expect(labelBox).not.toBeNull();
        if (labelBox) expect(labelBox.x).toBeGreaterThanOrEqual(chartBox.x);
      }
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(scenario.width);
    expect(errors).toEqual([]);
  });
}
