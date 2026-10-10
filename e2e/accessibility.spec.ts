import { expect, test } from '@playwright/test';
import { trackBrowserErrors } from './support/browser-errors';

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`supports keyboard navigation and reduced motion on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith(viewport.name));
    const assertNoBrowserErrors = trackBrowserErrors(page);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ json: profile }),
    );

    await page.goto('/profile');
    await expect(
      page.getByRole('heading', { name: 'Профиль', level: 1 }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Перейти к содержимому' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    expect(
      await skipLink.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    const durations = await page.evaluate(() => {
      const element = document.createElement('div');
      element.style.animationDuration = '1s';
      element.style.transitionDuration = '1s';
      document.body.append(element);
      const style = getComputedStyle(element);
      const values = [style.animationDuration, style.transitionDuration];
      element.remove();
      return values;
    });
    for (const duration of durations)
      expect(Number.parseFloat(duration)).toBeLessThan(0.1);
    assertNoBrowserErrors();
  });
}
