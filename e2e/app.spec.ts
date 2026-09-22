import { expect, test } from '@playwright/test';

const seedAccounts = [
  {
    name: 'личный',
    email: 'personal@taler.local',
    password: 'TalerPersonal2026!',
    displayName: 'Личный',
  },
  {
    name: 'семейный',
    email: 'family@taler.local',
    password: 'TalerFamily2026!',
    displayName: 'Семейный',
  },
] as const;

for (const account of seedAccounts) {
  test(`logs in with the ${account.name} seed account`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page
      .getByRole('textbox', { name: 'Пароль', exact: true })
      .fill(account.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(
      page.getByRole('heading', {
        name: `Добро пожаловать, ${account.displayName}`,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL('/');
  });
}

test('cannot reopen a protected page after logout', async ({ page }) => {
  const account = seedAccounts[0];

  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill(account.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(
    page.getByRole('heading', {
      name: `Добро пожаловать, ${account.displayName}`,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();

  await expect(
    page.getByRole('heading', { name: 'Вход в Taler' }),
  ).toBeVisible();
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
  await expect(
    page.getByRole('heading', { name: 'Вход в Taler' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Профиль' })).toHaveCount(0);
});
