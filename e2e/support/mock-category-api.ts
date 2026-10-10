import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';

interface MockCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  updatedAt: string;
}

const timestamp = '2026-09-21T10:00:00.000Z';
const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: timestamp,
  updatedAt: timestamp,
};

export async function installMockCategoryApi(page: Page): Promise<void> {
  let signedIn = false;
  let categories: MockCategory[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/auth/me') {
      await route.fulfill(
        signedIn
          ? { json: profile }
          : { status: 401, json: { code: 'UNAUTHORIZED' } },
      );
      return;
    }
    if (path === '/api/v1/auth/login' && method === 'POST') {
      signedIn = true;
      await route.fulfill({ json: profile });
      return;
    }
    if (path === '/api/v1/categories' && method === 'GET') {
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const items = categories.filter((category) =>
        category.name.toLowerCase().includes(search),
      );
      await route.fulfill({
        json: {
          items,
          meta: {
            page: 1,
            pageSize: 20,
            total: items.length,
            totalPages: items.length ? 1 : 0,
          },
        },
      });
      return;
    }
    if (path === '/api/v1/categories' && method === 'POST') {
      const input = request.postDataJSON() as Pick<
        MockCategory,
        'name' | 'icon' | 'color' | 'type'
      >;
      const category: MockCategory = {
        ...input,
        id: randomUUID(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      categories = [category, ...categories];
      await route.fulfill({ status: 201, json: category });
      return;
    }
    const categoryId = path.startsWith('/api/v1/categories/')
      ? path.slice('/api/v1/categories/'.length)
      : null;
    if (categoryId && method === 'PATCH') {
      const input = request.postDataJSON() as Partial<
        Pick<MockCategory, 'name' | 'icon' | 'color' | 'type'>
      >;
      const current = categories.find((category) => category.id === categoryId);
      if (!current) {
        await route.fulfill({
          status: 404,
          json: { code: 'CATEGORY_NOT_FOUND' },
        });
        return;
      }
      const updated = { ...current, ...input, updatedAt: timestamp };
      categories = categories.map((category) =>
        category.id === categoryId ? updated : category,
      );
      await route.fulfill({ json: updated });
      return;
    }
    if (categoryId && method === 'DELETE') {
      categories = categories.filter((category) => category.id !== categoryId);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.abort();
  });
}
