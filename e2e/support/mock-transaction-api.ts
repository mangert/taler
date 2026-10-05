import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';

interface MockTransaction {
  id: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  currency: string;
  exchangeRateToBase: string;
  baseAmount: string;
  transactionDate: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

type MockAuditSnapshot = Omit<MockTransaction, 'createdAt' | 'updatedAt'>;

interface MockAuditEntry {
  id: string;
  entityType: 'TRANSACTION';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  before: MockAuditSnapshot | null;
  after: MockAuditSnapshot | null;
  createdAt: string;
}

function auditSnapshot(
  record: MockTransaction | null,
): MockAuditSnapshot | null {
  if (!record) return null;
  return {
    id: record.id,
    categoryId: record.categoryId,
    type: record.type,
    amount: record.amount,
    currency: record.currency,
    exchangeRateToBase: record.exchangeRateToBase,
    baseAmount: record.baseAmount,
    transactionDate: record.transactionDate,
    description: record.description,
  };
}

const profile = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'personal@taler.local',
  displayName: 'Личный',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};
const category = {
  id: '20000000-0000-4000-8000-000000000003',
  name: 'Продукты',
  icon: 'shopping_cart',
  color: '#EF6C00',
  type: 'EXPENSE',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

export async function installMockTransactionApi(page: Page): Promise<void> {
  let signedIn = false;
  let records: MockTransaction[] = [];
  let auditEntries: MockAuditEntry[] = [];
  const recordAudit = (
    action: MockAuditEntry['action'],
    entityId: string,
    before: MockTransaction | null,
    after: MockTransaction | null,
  ): void => {
    auditEntries = [
      {
        id: randomUUID(),
        entityType: 'TRANSACTION',
        entityId,
        action,
        before: auditSnapshot(before),
        after: auditSnapshot(after),
        createdAt: new Date().toISOString(),
      },
      ...auditEntries,
    ];
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/auth/me') {
      await route.fulfill(
        signedIn
          ? { json: profile }
          : {
              status: 401,
              json: {
                statusCode: 401,
                code: 'UNAUTHORIZED',
                message: 'Unauthorized',
                details: [],
              },
            },
      );
      return;
    }
    if (path === '/api/v1/auth/login' && method === 'POST') {
      signedIn = true;
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
    if (path === '/api/v1/audit-log' && method === 'GET') {
      const action = url.searchParams.get('action');
      const filtered = auditEntries.filter(
        (entry) => !action || entry.action === action,
      );
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
      await route.fulfill({
        json: {
          items: filtered.slice(
            (pageNumber - 1) * pageSize,
            pageNumber * pageSize,
          ),
          meta: {
            page: pageNumber,
            pageSize,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / pageSize),
          },
        },
      });
      return;
    }
    if (path === '/api/v1/transactions' && method === 'GET') {
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const items = records.filter((record) =>
        (record.description ?? '').toLowerCase().includes(search),
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
    if (path === '/api/v1/transactions' && method === 'POST') {
      const input = request.postDataJSON() as Omit<
        MockTransaction,
        'id' | 'baseAmount' | 'createdAt' | 'updatedAt'
      >;
      const timestamp = '2026-09-21T10:00:00.000Z';
      const record: MockTransaction = {
        ...input,
        id: randomUUID(),
        baseAmount: input.amount,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      records = [record, ...records];
      recordAudit('CREATE', record.id, null, record);
      await route.fulfill({ status: 201, json: record });
      return;
    }
    const transactionId = path.startsWith('/api/v1/transactions/')
      ? path.slice('/api/v1/transactions/'.length)
      : null;
    if (transactionId && method === 'GET') {
      const current = records.find((record) => record.id === transactionId);
      await route.fulfill(
        current
          ? { json: current }
          : { status: 404, json: { code: 'TRANSACTION_NOT_FOUND' } },
      );
      return;
    }
    if (transactionId && method === 'PATCH') {
      const input = request.postDataJSON() as Partial<MockTransaction>;
      const current = records.find((record) => record.id === transactionId);
      if (!current) {
        await route.fulfill({
          status: 404,
          json: {
            statusCode: 404,
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Not found',
            details: [],
          },
        });
        return;
      }
      const updated = {
        ...current,
        ...input,
        baseAmount: input.amount ?? current.baseAmount,
        updatedAt: new Date().toISOString(),
      };
      records = records.map((record) =>
        record.id === transactionId ? updated : record,
      );
      recordAudit('UPDATE', transactionId, current, updated);
      await route.fulfill({ json: updated });
      return;
    }
    if (transactionId && method === 'DELETE') {
      const current = records.find((record) => record.id === transactionId);
      records = records.filter((record) => record.id !== transactionId);
      if (current) recordAudit('DELETE', transactionId, current, null);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.abort();
  });
}
