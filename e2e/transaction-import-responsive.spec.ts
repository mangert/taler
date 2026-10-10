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

async function expectNoHorizontalOverflow(page: Page, width: number) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width);
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`keeps CSV mapping usable on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith(viewport.name));
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    if (testInfo.project.name.startsWith('mock-')) {
      await installMockTransactionApi(page);
    }
    await signIn(page);
    await page.goto('/transaction-imports');

    const stepper = page.getByRole('navigation', { name: 'Этапы импорта' });
    await expect(stepper.getByRole('listitem').first()).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(
      page.getByRole('button', { name: 'Выбрать файл' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, viewport.width);

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Зона загрузки CSV' }).focus();
    await page.keyboard.press('Enter');
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'Date,Amount,Category,Type,Description,Currency,Rate\n2026-09-21,15.50,Продукты,EXPENSE,Обед,RUB,1\n',
      ),
    });

    const form = page.getByRole('form', { name: 'Сопоставление колонок' });
    await expect(form).toBeVisible();
    const date = await form
      .getByRole('combobox', { name: 'Дата' })
      .boundingBox();
    const amount = await form
      .getByRole('combobox', { name: 'Сумма' })
      .boundingBox();
    expect(date).not.toBeNull();
    expect(amount).not.toBeNull();
    if (!date || !amount) return;

    if (viewport.name === 'mobile') {
      expect(amount.y).toBeGreaterThanOrEqual(date.y + date.height);
    } else {
      expect(Math.abs(amount.y - date.y)).toBeLessThan(2);
    }
    await expectNoHorizontalOverflow(page, viewport.width);

    await form.getByRole('button', { name: 'Предпросмотр' }).click();
    await expect(
      page.getByRole('heading', { name: 'Предварительный просмотр' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, viewport.width);
  });
}
