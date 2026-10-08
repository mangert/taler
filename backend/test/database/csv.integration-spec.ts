import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import request from 'supertest';

import { AuditService } from '../../src/audit/audit.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { authenticateRequest } from '../support/authenticate-request.js';
import { createTestApplication } from '../support/create-test-application.js';
import { createTestUser, type TestUserFixture } from '../support/factories.js';

const mapping = {
  date: 'Date',
  amount: 'Amount',
  category: 'Category',
  type: 'Type',
  currency: 'Currency',
  rate: 'Rate',
  description: 'Description',
};

describe('CSV import and export with PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: TestUserFixture;
  let otherUser: TestUserFixture;
  let categoryId: string;
  let foreignCategoryId: string;

  const upload = (csv: string) =>
    authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transaction-imports'),
      owner,
    )
      .field('mapping', JSON.stringify(mapping))
      .attach('file', Buffer.from(csv), {
        filename: 'transactions.csv',
        contentType: 'text/csv',
      });

  beforeAll(async () => {
    app = await createTestApplication();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    owner = createTestUser('first', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    otherUser = createTestUser('second', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    categoryId = randomUUID();
    foreignCategoryId = randomUUID();
    await prisma.user.createMany({
      data: [owner, otherUser].map((user) => ({
        id: user.id,
        email: user.email,
        passwordHash: 'integration-test-hash',
        displayName: user.displayName,
        baseCurrency: user.baseCurrency,
        timeZone: user.timeZone,
      })),
    });
    await prisma.category.createMany({
      data: [
        {
          id: categoryId,
          userId: owner.id,
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#2E7D32',
          type: 'EXPENSE',
        },
        {
          id: foreignCategoryId,
          userId: otherUser.id,
          name: 'Private',
          icon: 'shopping-cart',
          color: '#2E7D32',
          type: 'EXPENSE',
        },
      ],
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, otherUser.id] } },
    });
  });
  afterAll(async () => app.close());

  it('persists a mapped UTF-8 import with exact Decimal amounts and CREATE audit snapshots', async () => {
    const csv = [
      '\uFEFFDate,Amount,Category,Type,Currency,Rate,Description',
      '2026-09-01,12.3456,Groceries,EXPENSE,USD,0.92000000,Coffee',
      '2026-09-02,5,Groceries,EXPENSE,EUR,1,Tea',
    ].join('\r\n');
    expect((await upload(csv).expect(201)).body).toEqual({ importedCount: 2 });
    const records = await prisma.transaction.findMany({
      where: { userId: owner.id },
      orderBy: { transactionDate: 'asc' },
    });
    expect(records.map((record) => record.baseAmount.toFixed(4))).toEqual([
      '11.3580',
      '5.0000',
    ]);
    const audits = await prisma.auditLog.findMany({
      where: { userId: owner.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(audits).toHaveLength(2);
    expect(audits.map((entry) => entry.entityId).sort()).toEqual(
      records.map((record) => record.id).sort(),
    );
    expect(audits[0]).toMatchObject({
      entityType: 'TRANSACTION',
      action: 'CREATE',
      before: null,
    });
    expect(audits[0].after).toMatchObject({
      amount: '12.3456',
      baseAmount: '11.3580',
    });
  });

  it('rolls back every imported transaction when the second audit write fails', async () => {
    const audit = app.get(AuditService);
    const realRecord = audit.record.bind(audit);
    let calls = 0;
    jest.spyOn(audit, 'record').mockImplementation((transaction, entry) => {
      calls += 1;
      return calls === 2
        ? Promise.reject(new Error('Injected audit failure'))
        : realRecord(transaction, entry);
    });
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      '2026-09-01,10,Groceries,EXPENSE,EUR,1,First',
      '2026-09-02,20,Groceries,EXPENSE,EUR,1,Second',
    ].join('\n');
    await upload(csv).expect(500);
    expect(calls).toBe(2);
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );
  });

  it('exports only owned rows matching the same filters as the transaction list', async () => {
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      '2026-09-01,10,Groceries,EXPENSE,EUR,1,Morning coffee',
      '2026-09-02,20,Groceries,EXPENSE,EUR,1,Tea',
    ].join('\n');
    await upload(csv).expect(201);
    await prisma.transaction.create({
      data: {
        userId: otherUser.id,
        categoryId: foreignCategoryId,
        type: 'EXPENSE',
        amount: '10.0000',
        currency: 'EUR',
        exchangeRateToBase: '1',
        baseAmount: '10.0000',
        transactionDate: new Date('2026-09-01T00:00:00.000Z'),
        description: 'Foreign coffee',
      },
    });
    const filters = `search=coffee&categoryId=${categoryId}&dateFrom=2026-09-01&dateTo=2026-09-02&minAmount=10&maxAmount=20&type=EXPENSE`;
    const listed = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/transactions?${filters}`),
      owner,
    ).expect(200);
    const exported = await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/transactions/export?${filters}`,
      ),
      owner,
    ).expect(200);
    const rows = parse(exported.text, { bom: true, columns: true }) as {
      description: string;
      category: string;
    }[];
    expect(rows.map((row) => row.description)).toEqual(
      (listed.body.items as { description: string }[]).map(
        (item) => item.description,
      ),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        description: 'Morning coffee',
        category: 'Groceries',
      }),
    ]);
    const foreign = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions/export'),
      otherUser,
    ).expect(200);
    expect(foreign.text).toContain('Foreign coffee');
    expect(foreign.text).not.toContain('Morning coffee');
  });

  it('streams more than one internal database batch without losing rows', async () => {
    await prisma.transaction.createMany({
      data: Array.from({ length: 501 }, (_, index) => ({
        userId: owner.id,
        categoryId,
        type: 'EXPENSE' as const,
        amount: '1.0000',
        currency: 'EUR',
        exchangeRateToBase: '1.00000000',
        baseAmount: '1.0000',
        transactionDate: new Date('2026-09-01T00:00:00.000Z'),
        description: `Batch row ${index}`,
      })),
    });
    const exported = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions/export'),
      owner,
    ).expect(200);
    const rows = parse(exported.text, { bom: true, columns: true }) as {
      description: string;
    }[];
    expect(rows).toHaveLength(501);
    expect(new Set(rows.map((row) => row.description)).size).toBe(501);
  });
});
