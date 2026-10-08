import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { parse } from 'csv-parse/sync';
import { Prisma } from '../src/generated/prisma/client.js';
import { DatabaseHealthIndicator } from '../src/health/database-health.indicator.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { authenticateRequest } from './support/authenticate-request.js';
import { createTestCategory, createTestUser } from './support/factories.js';
import { createTestApplication } from './support/create-test-application.js';

const user = createTestUser('first');
const otherUser = createTestUser('second');
const category = createTestCategory(user, 'first');
const incomeCategory = createTestCategory(user, 'first', {
  id: '11111111-1111-4111-8111-111111111114',
  name: 'Income',
  type: 'INCOME',
});
const otherCategory = createTestCategory(otherUser, 'second');
const timestamp = new Date('2026-09-01T10:00:00.000Z');
type TransactionRecord = {
  id: string;
  userId: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: Prisma.Decimal;
  currency: string;
  exchangeRateToBase: Prisma.Decimal;
  baseAmount: Prisma.Decimal;
  transactionDate: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type Where = {
  id?: string;
  userId: string;
  categoryId?: string;
  type?: string;
  description?: { contains: string };
  transactionDate?: { gte?: Date; lte?: Date };
  amount?: { gte?: string; lte?: string };
};
const input = {
  categoryId: category.id,
  type: 'EXPENSE',
  amount: '12.3456',
  currency: 'USD',
  exchangeRateToBase: '0.92000000',
  transactionDate: '2026-09-01',
  description: 'Coffee',
};
const csvMapping = {
  date: 'Date',
  amount: 'Amount',
  category: 'Category',
  type: 'Type',
  currency: 'Currency',
  rate: 'Rate',
  description: 'Description',
};

describe('transactions (e2e)', () => {
  let app: INestApplication;
  let created: Record<string, unknown> | undefined;
  let records: TransactionRecord[];
  let auditRecords: Record<string, unknown>[];
  let failAuditWrite: boolean;
  let listArgs:
    | { where: Where; skip?: number; take?: number; orderBy: unknown }
    | undefined;

  function uploadCsv(
    contents: string | Buffer,
    options: { owner?: typeof user; mapping?: object; mime?: string } = {},
  ) {
    return authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transaction-imports'),
      options.owner ?? user,
    )
      .field('mapping', JSON.stringify(options.mapping ?? csvMapping))
      .attach(
        'file',
        Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
        {
          filename: 'transactions.csv',
          contentType: options.mime ?? 'text/csv',
        },
      );
  }

  function matches(record: TransactionRecord, where: Where): boolean {
    return (
      record.userId === where.userId &&
      (!where.id || record.id === where.id) &&
      (!where.categoryId || record.categoryId === where.categoryId) &&
      (!where.type || record.type === where.type) &&
      (!where.description ||
        (record.description ?? '')
          .toLowerCase()
          .includes(where.description.contains.toLowerCase())) &&
      (!where.transactionDate?.gte ||
        record.transactionDate >= where.transactionDate.gte) &&
      (!where.transactionDate?.lte ||
        record.transactionDate <= where.transactionDate.lte) &&
      (!where.amount?.gte || record.amount.gte(where.amount.gte)) &&
      (!where.amount?.lte || record.amount.lte(where.amount.lte))
    );
  }

  beforeEach(async () => {
    created = undefined;
    records = [];
    auditRecords = [];
    failAuditWrite = false;
    listArgs = undefined;
    const prisma = {
      user: { findUnique: async () => ({ baseCurrency: 'EUR' }) },
      category: {
        findMany: async ({ where }: { where: { userId: string } }) =>
          [category, incomeCategory, otherCategory].filter(
            (candidate) => candidate.userId === where.userId,
          ),
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string };
        }) =>
          [category, incomeCategory, otherCategory].find(
            (candidate) =>
              candidate.id === where.id && candidate.userId === where.userId,
          ) ?? null,
      },
      transaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created = data;
          const record: TransactionRecord = {
            id: `33333333-3333-4333-8333-${String(records.length + 1).padStart(12, '0')}`,
            userId: String(data.userId),
            categoryId: String(data.categoryId),
            type: data.type as 'INCOME' | 'EXPENSE',
            amount: new Prisma.Decimal(String(data.amount)),
            currency: String(data.currency),
            exchangeRateToBase: new Prisma.Decimal(
              String(data.exchangeRateToBase),
            ),
            baseAmount: new Prisma.Decimal(String(data.baseAmount)),
            transactionDate: data.transactionDate as Date,
            description: data.description as string | null,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          records.push(record);
          return record;
        },
        findFirst: async ({ where }: { where: Where }) =>
          records.find((record) => matches(record, where)) ?? null,
        findMany: async (args: {
          where: Where;
          skip?: number;
          take?: number;
          cursor?: { id: string };
          orderBy: unknown;
          include?: unknown;
        }) => {
          listArgs = args;
          const ordered = records
            .filter((record) => matches(record, args.where))
            .sort(
              (a, b) =>
                b.transactionDate.getTime() - a.transactionDate.getTime() ||
                b.id.localeCompare(a.id),
            );
          const start = args.cursor
            ? ordered.findIndex((record) => record.id === args.cursor?.id) + 1
            : (args.skip ?? 0);
          const page =
            args.take === undefined
              ? ordered.slice(start)
              : ordered.slice(start, start + args.take);
          return args.include
            ? page.map((record) => ({
                ...record,
                category: {
                  name:
                    [category, incomeCategory, otherCategory].find(
                      (candidate) => candidate.id === record.categoryId,
                    )?.name ?? '',
                },
              }))
            : page;
        },
        count: async ({ where }: { where: Where }) =>
          records.filter((record) => matches(record, where)).length,
        update: async ({
          where,
          data,
        }: {
          where: Where;
          data: Partial<TransactionRecord>;
        }) => {
          const index = records.findIndex((candidate) =>
            matches(candidate, where),
          );
          if (index < 0) throw new Error('Missing record');
          const updated = { ...records[index], ...data };
          records[index] = updated;
          return updated;
        },
        delete: async ({ where }: { where: Where }) => {
          const index = records.findIndex((record) => matches(record, where));
          if (index < 0) throw new Error('Missing record');
          return records.splice(index, 1)[0];
        },
      },
    };
    const transactionClient = {
      ...prisma,
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          if (failAuditWrite) throw new Error('Audit write failed');
          auditRecords.push(data);
          return { ...data, id: '60000000-0000-4000-8000-000000000001' };
        },
      },
    };
    const prismaOverride = {
      ...prisma,
      $transaction: async <T>(
        operation: (client: typeof transactionClient) => Promise<T>,
      ): Promise<T> => {
        const previousRecords = records;
        const previousAudits = auditRecords;
        records = records.map((record) => ({ ...record }));
        auditRecords = [...auditRecords];
        try {
          return await operation(transactionClient);
        } catch (error: unknown) {
          records = previousRecords;
          auditRecords = previousAudits;
          throw error;
        }
      },
    };
    app = await createTestApplication({
      enableSwagger: true,
      configureModule: (builder) =>
        builder
          .overrideProvider(DatabaseHealthIndicator)
          .useValue({ check: async (): Promise<void> => undefined })
          .overrideProvider(PrismaService)
          .useValue(prismaOverride),
    });
  });

  afterEach(async () => app.close());

  it('creates an owned transaction and calculates its base amount', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(201);
    expect(response.body).toMatchObject({
      amount: '12.3456',
      baseAmount: '11.3580',
      currency: 'USD',
      transactionDate: '2026-09-01',
    });
    expect(created?.userId).toBe(user.id);
    expect((created?.baseAmount as Prisma.Decimal).eq('11.3580')).toBe(true);
    expect(auditRecords).toEqual([
      expect.objectContaining({
        userId: user.id,
        entityType: 'TRANSACTION',
        action: 'CREATE',
        after: expect.objectContaining({ amount: '12.3456' }),
      }),
    ]);
  });

  it('rolls back transaction creation when the audit write fails', async () => {
    failAuditWrite = true;
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(500);
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('requires authentication and rejects client-owned fields', async () => {
    await request(app.getHttpServer()).get('/api/v1/transactions').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .send(input)
      .expect(401);
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, userId: otherUser.id, baseAmount: '1.0000' })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(records).toHaveLength(0);
  });

  it('requires all create fields and rejects an empty update', async () => {
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ description: 'Incomplete' })
      .expect(400);
    const own = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(201);
    const response = await authenticateRequest(
      request(app.getHttpServer()).patch(
        `/api/v1/transactions/${own.body.id as string}`,
      ),
      user,
    )
      .send({})
      .expect(400);
    expect(response.body.code).toBe('EMPTY_UPDATE');
  });

  it('rejects a foreign category or mismatched category type', async () => {
    const foreign = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, categoryId: otherCategory.id })
      .expect(404);
    expect(foreign.body.code).toBe('CATEGORY_NOT_FOUND');
    const mismatch = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, type: 'INCOME' })
      .expect(400);
    expect(mismatch.body.code).toBe('CATEGORY_TYPE_MISMATCH');
  });

  it('validates rate, decimal amount and calendar dates', async () => {
    for (const body of [
      { ...input, currency: 'EUR', exchangeRateToBase: '0.92000000' },
      { ...input, amount: '0' },
      { ...input, transactionDate: '2026-02-30' },
      { ...input, exchangeRateToBase: '0' },
    ]) {
      await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send(body)
        .expect(400);
    }
    expect(records).toHaveLength(0);
  });

  it('reads, updates and deletes an owned transaction with recalculation', async () => {
    const createdResponse = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(201);
    const id: string = createdResponse.body.id;
    await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/transactions/${id}`),
      user,
    ).expect(200);
    const updated = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/transactions/${id}`),
      user,
    )
      .send({ amount: '20.0000' })
      .expect(200);
    expect(updated.body.baseAmount).toBe('18.4000');
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/transactions/${id}`),
      user,
    ).expect(204);
    expect(records).toHaveLength(0);
    expect(auditRecords.map((entry) => entry.action)).toEqual([
      'CREATE',
      'UPDATE',
      'DELETE',
    ]);
    expect(auditRecords[0]).not.toHaveProperty('before');
    expect(auditRecords[0].after).toMatchObject({ amount: '12.3456' });
    expect(auditRecords[1].before).toMatchObject({ amount: '12.3456' });
    expect(auditRecords[1].after).toMatchObject({ amount: '20.0000' });
    expect(auditRecords[2].before).toMatchObject({ amount: '20.0000' });
    expect(auditRecords[2]).not.toHaveProperty('after');
  });

  it('rolls back updates and deletion when the audit write fails', async () => {
    const createdResponse = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(201);
    const id: string = createdResponse.body.id;
    failAuditWrite = true;

    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/transactions/${id}`),
      user,
    )
      .send({ amount: '20.0000' })
      .expect(500);
    expect(records[0].amount.toFixed(4)).toBe('12.3456');

    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/transactions/${id}`),
      user,
    ).expect(500);
    expect(records).toHaveLength(1);
    expect(auditRecords.map((entry) => entry.action)).toEqual(['CREATE']);
  });

  it('returns 404 for another user transaction on read, update and delete', async () => {
    const own = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send(input)
      .expect(201);
    const path = `/api/v1/transactions/${own.body.id as string}`;
    await authenticateRequest(
      request(app.getHttpServer()).get(path),
      otherUser,
    ).expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).patch(path),
      otherUser,
    )
      .send({ description: 'Changed' })
      .expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).delete(path),
      otherUser,
    ).expect(404);
    expect(records[0].description).toBe('Coffee');
  });

  it('combines filters, paginates and sorts deterministically', async () => {
    for (const description of ['Coffee A', 'Coffee B', 'Other']) {
      await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send({ ...input, description })
        .expect(201);
    }
    const response = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/transactions?search=coffee&dateFrom=2026-09-01&dateTo=2026-09-01&categoryId=' +
          category.id +
          '&minAmount=10&maxAmount=20&type=EXPENSE&page=2&pageSize=1',
      ),
      user,
    ).expect(200);
    expect(response.body).toMatchObject({
      items: [{ description: 'Coffee A' }],
      meta: { page: 2, pageSize: 1, total: 2, totalPages: 2 },
    });
    expect(listArgs?.orderBy).toEqual([
      { transactionDate: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('rejects invalid filter ranges and pagination', async () => {
    for (const query of [
      '?dateFrom=2026-09-02&dateTo=2026-09-01',
      '?minAmount=20&maxAmount=10',
      '?page=0&pageSize=101',
    ]) {
      await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/transactions' + query),
        user,
      ).expect(400);
    }
  });

  it('applies every list filter with inclusive date and amount boundaries', async () => {
    const samples = [
      {
        description: 'Morning Coffee',
        amount: '10.0000',
        transactionDate: '2026-09-01',
      },
      { description: 'Rent', amount: '20.0000', transactionDate: '2026-09-02' },
      {
        description: 'Evening Coffee',
        amount: '30.0000',
        transactionDate: '2026-09-03',
      },
      {
        description: 'Salary',
        amount: '40.0000',
        transactionDate: '2026-09-02',
        categoryId: incomeCategory.id,
        type: 'INCOME',
      },
    ];
    for (const sample of samples) {
      await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send({ ...input, currency: 'EUR', exchangeRateToBase: '1', ...sample })
        .expect(201);
    }
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      otherUser,
    )
      .send({
        ...input,
        categoryId: otherCategory.id,
        currency: 'EUR',
        exchangeRateToBase: '1',
        description: 'Other Coffee',
      })
      .expect(201);

    const cases = [
      {
        query: '',
        expected: ['Morning Coffee', 'Rent', 'Evening Coffee', 'Salary'],
      },
      {
        query: '?search=cOfFeE',
        expected: ['Morning Coffee', 'Evening Coffee'],
      },
      {
        query: '?dateFrom=2026-09-02',
        expected: ['Rent', 'Evening Coffee', 'Salary'],
      },
      {
        query: '?dateTo=2026-09-02',
        expected: ['Morning Coffee', 'Rent', 'Salary'],
      },
      { query: `?categoryId=${incomeCategory.id}`, expected: ['Salary'] },
      {
        query: '?minAmount=20.0000',
        expected: ['Rent', 'Evening Coffee', 'Salary'],
      },
      { query: '?maxAmount=20.0000', expected: ['Morning Coffee', 'Rent'] },
      { query: '?type=INCOME', expected: ['Salary'] },
      {
        query: '?dateFrom=2026-09-02&dateTo=2026-09-02',
        expected: ['Rent', 'Salary'],
      },
      { query: '?minAmount=20.0000&maxAmount=20.0000', expected: ['Rent'] },
    ];
    for (const { query, expected } of cases) {
      const response = await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/transactions' + query),
        user,
      ).expect(200);
      const body = response.body as {
        items: { description: string }[];
        meta: { total: number };
      };
      expect({
        query,
        descriptions: new Set(body.items.map((item) => item.description)),
        total: body.meta.total,
      }).toEqual({
        query,
        descriptions: new Set(expected),
        total: expected.length,
      });
    }
  });

  it('returns deterministic first, last and empty pages at pagination boundaries', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const response = await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send({ ...input, description: `Page ${index}` })
        .expect(201);
      ids.push((response.body as { id: string }).id);
    }
    for (const [page, expectedIds] of [
      [1, [ids[4], ids[3]]],
      [3, [ids[0]]],
      [4, []],
    ] as const) {
      const response = await authenticateRequest(
        request(app.getHttpServer()).get(
          `/api/v1/transactions?page=${page}&pageSize=2`,
        ),
        user,
      ).expect(200);
      expect(response.body).toMatchObject({
        items: expectedIds.map((id) => ({ id })),
        meta: { page, pageSize: 2, total: 5, totalPages: 3 },
      });
    }
  });

  it('rounds decimal products without binary arithmetic and rejects base overflow', async () => {
    const rounded = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, amount: '0.0001', exchangeRateToBase: '0.50000000' })
      .expect(201);
    expect(rounded.body).toMatchObject({
      amount: '0.0001',
      baseAmount: '0.0001',
    });

    const exact = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({
        ...input,
        amount: '999999999999999.9999',
        currency: 'EUR',
        exchangeRateToBase: '1',
      })
      .expect(201);
    expect(exact.body.baseAmount).toBe('999999999999999.9999');

    const overflow = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({
        ...input,
        amount: '999999999999999.9999',
        exchangeRateToBase: '2',
      })
      .expect(400);
    expect(overflow.body.code).toBe('BASE_AMOUNT_OVERFLOW');
    expect(records).toHaveLength(2);
  });

  it('rejects malformed filter values and decimal precision beyond the contract', async () => {
    for (const query of [
      '?dateFrom=2026-02-30',
      '?minAmount=1.00000',
      '?type=TRANSFER',
      '?page=1.5',
      '?pageSize=0',
    ]) {
      await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/transactions' + query),
        user,
      ).expect(400);
    }
    for (const body of [
      { ...input, amount: '1.00000' },
      { ...input, exchangeRateToBase: '1.000000000' },
    ]) {
      await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send(body)
        .expect(400);
    }
    expect(records).toHaveLength(0);
  });

  it('documents protected CRUD and decimal fields in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths).toMatchObject({
      '/api/v1/transactions': {
        get: {
          security: [{ cookieAuth: [] }],
          responses: { 200: {}, 400: {}, 401: {} },
        },
        post: {
          security: [{ cookieAuth: [] }],
          responses: { 201: {}, 400: {}, 404: {} },
        },
      },
      '/api/v1/transactions/{id}': {
        get: { responses: { 200: {}, 404: {} } },
        patch: { responses: { 200: {}, 400: {}, 404: {} } },
        delete: { responses: { 204: {}, 404: {} } },
      },
    });
    expect(
      response.body.components.schemas.CreateTransactionDto.properties.amount
        .example,
    ).toBe('12.3456');
    expect(
      response.body.components.schemas.CreateTransactionDto.required,
    ).toEqual(
      expect.arrayContaining([
        'categoryId',
        'type',
        'amount',
        'currency',
        'exchangeRateToBase',
        'transactionDate',
      ]),
    );
    expect(
      response.body.components.schemas.TransactionResponseDto.properties
        .baseAmount.example,
    ).toBe('12.3456');
  });

  it('imports mapped CSV rows with matching audit entries', async () => {
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      `2026-09-01,12.3456,${category.id},EXPENSE,USD,0.92000000,Coffee`,
      `2026-09-02,5,${category.id},EXPENSE,EUR,1,Tea`,
    ].join('\n');
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transaction-imports'),
      user,
    )
      .field(
        'mapping',
        JSON.stringify({
          date: 'Date',
          amount: 'Amount',
          category: 'Category',
          type: 'Type',
          currency: 'Currency',
          rate: 'Rate',
          description: 'Description',
        }),
      )
      .attach('file', Buffer.from(csv), {
        filename: 'transactions.csv',
        contentType: 'text/csv',
      })
      .expect(201);
    expect(response.body).toEqual({ importedCount: 2 });
    expect(records).toHaveLength(2);
    expect(records[0].baseAmount.toFixed(4)).toBe('11.3580');
    expect(auditRecords).toHaveLength(2);
  });

  it.each([
    {
      name: 'an invalid calendar date',
      row: `2026-02-30,10,${category.id},EXPENSE,EUR,1,Test`,
      field: 'date',
      code: 'INVALID_DATE',
    },
    {
      name: 'an unsupported transaction type',
      row: `2026-09-01,10,${category.id},TRANSFER,EUR,1,Test`,
      field: 'type',
      code: 'INVALID_TYPE',
    },
    {
      name: 'a category owned by another user',
      row: `2026-09-01,10,${otherCategory.id},EXPENSE,EUR,1,Test`,
      field: 'category',
      code: 'CATEGORY_NOT_FOUND',
    },
    {
      name: 'a category with the wrong type',
      row: `2026-09-01,10,${category.id},INCOME,EUR,1,Test`,
      field: 'category',
      code: 'CATEGORY_TYPE_MISMATCH',
    },
    {
      name: 'a non-positive amount',
      row: `2026-09-01,0,${category.id},EXPENSE,EUR,1,Test`,
      field: 'amount',
      code: 'INVALID_AMOUNT',
    },
    {
      name: 'an invalid currency',
      row: `2026-09-01,10,${category.id},EXPENSE,E1R,1,Test`,
      field: 'currency',
      code: 'INVALID_CURRENCY',
    },
    {
      name: 'a missing rate for a foreign currency',
      row: `2026-09-01,10,${category.id},EXPENSE,USD,,Test`,
      field: 'rate',
      code: 'INVALID_RATE',
    },
    {
      name: 'a description longer than 500 characters',
      row: `2026-09-01,10,${category.id},EXPENSE,EUR,1,${'A'.repeat(501)}`,
      field: 'description',
      code: 'INVALID_DESCRIPTION',
    },
    {
      name: 'a calculated base amount beyond the supported precision',
      row: `2026-09-01,999999999999999,${category.id},EXPENSE,USD,2,Test`,
      field: 'amount',
      code: 'BASE_AMOUNT_OVERFLOW',
    },
    {
      name: 'a row with a different column count',
      row: `2026-09-01,10,${category.id},EXPENSE,EUR,1`,
      field: 'file',
      code: 'CSV_COLUMN_COUNT',
    },
  ])(
    'rejects CSV row with $name without writes',
    async ({ row, field, code }) => {
      const csv = [
        'Date,Amount,Category,Type,Currency,Rate,Description',
        row,
      ].join('\n');
      const response = await uploadCsv(csv).expect(400);
      expect(response.body.code).toBe('CSV_ROW_ERRORS');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({ row: 2, field, code }),
      );
      expect(records).toHaveLength(0);
      expect(auditRecords).toHaveLength(0);
    },
  );

  it.each([
    {
      name: 'a header without data rows',
      csv: 'Date,Amount,Category,Type,Currency,Rate,Description',
      code: 'EMPTY_CSV',
    },
    {
      name: 'an unclosed quoted field',
      csv: 'Date,Amount,Category,Type,Currency,Rate,Description\n"2026-09-01,10',
      code: 'INVALID_CSV',
    },
    {
      name: 'duplicate headers',
      csv: 'Date,Date,Category,Type,Currency,Rate,Description\n2026-09-01,10,Test,EXPENSE,EUR,1,Test',
      code: 'INVALID_CSV_HEADERS',
    },
    {
      name: 'an empty header',
      csv: 'Date,,Category,Type,Currency,Rate,Description\n2026-09-01,10,Test,EXPENSE,EUR,1,Test',
      code: 'INVALID_CSV_HEADERS',
    },
    {
      name: 'a missing mapped header',
      csv: 'When,Amount,Category,Type,Currency,Rate,Description\n2026-09-01,10,Test,EXPENSE,EUR,1,Test',
      code: 'INVALID_MAPPING',
    },
  ])('rejects CSV with $name without writes', async ({ csv, code }) => {
    const response = await uploadCsv(csv).expect(400);
    expect(response.body.code).toBe(code);
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('requires a file and rejects an empty upload without writes', async () => {
    const missing = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transaction-imports'),
      user,
    )
      .field('mapping', JSON.stringify(csvMapping))
      .expect(400);
    expect(missing.body.code).toBe('CSV_FILE_REQUIRED');
    const empty = await uploadCsv(Buffer.alloc(0)).expect(400);
    expect(empty.body.code).toBe('INVALID_CSV_SIZE');
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('collects numbered CSV row errors without persisting valid rows', async () => {
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      `2026-09-01,10,${category.id},EXPENSE,EUR,1,Valid`,
      `2026-02-30,0,${otherCategory.id},INCOME,USD,0,Bad`,
    ].join('\n');
    const response = await uploadCsv(csv).expect(400);
    expect(response.body.code).toBe('CSV_ROW_ERRORS');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 3,
          field: 'date',
          code: 'INVALID_DATE',
        }),
        expect.objectContaining({
          row: 3,
          field: 'category',
          code: 'CATEGORY_NOT_FOUND',
        }),
        expect.objectContaining({
          row: 3,
          field: 'amount',
          code: 'INVALID_AMOUNT',
        }),
        expect.objectContaining({
          row: 3,
          field: 'rate',
          code: 'INVALID_RATE',
        }),
      ]),
    );
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('reports the starting physical line of a multiline invalid CSV row', async () => {
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      `2026-09-01,0,${category.id},EXPENSE,EUR,1,"Bad\nrow"`,
    ].join('\n');
    const response = await uploadCsv(csv).expect(400);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ row: 2, field: 'amount' }),
    );
    expect(records).toHaveLength(0);
  });

  it('rolls back the whole CSV import when an audit write fails', async () => {
    failAuditWrite = true;
    const csv = [
      'Date,Amount,Category,Type,Currency,Rate,Description',
      `2026-09-01,10,${category.id},EXPENSE,EUR,1,First`,
      `2026-09-02,20,${category.id},EXPENSE,EUR,1,Second`,
    ].join('\n');
    await uploadCsv(csv).expect(500);
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('rejects invalid CSV mapping, MIME type and UTF-8 encoding', async () => {
    const csv = `Date,Amount,Category,Type,Currency,Rate,Description\n2026-09-01,10,${category.id},EXPENSE,EUR,1,Valid`;
    expect(
      (await uploadCsv(csv, { mapping: { date: 'Date' } }).expect(400)).body
        .code,
    ).toBe('INVALID_MAPPING');
    expect(
      (
        await uploadCsv(csv, {
          mapping: { ...csvMapping, amount: 'Date' },
        }).expect(400)
      ).body.code,
    ).toBe('INVALID_MAPPING');
    expect(
      (await uploadCsv(csv, { mime: 'application/pdf' }).expect(400)).body.code,
    ).toBe('INVALID_CSV_MIME');
    expect(
      (await uploadCsv(Buffer.from([0xff, 0xfe]), {}).expect(400)).body.code,
    ).toBe('INVALID_CSV_ENCODING');
    expect(records).toHaveLength(0);
  });

  it('uses owned category names and base currency when optional mappings are absent', async () => {
    const csv = `Date,Amount,Category,Type\n2026-09-01,10.50,${category.name},EXPENSE`;
    const response = await uploadCsv(csv, {
      mapping: {
        date: 'Date',
        amount: 'Amount',
        category: 'Category',
        type: 'Type',
      },
    }).expect(201);
    expect(response.body.importedCount).toBe(1);
    expect(records[0]).toMatchObject({
      categoryId: category.id,
      currency: 'EUR',
    });
    expect(records[0].exchangeRateToBase.toFixed(8)).toBe('1.00000000');
  });

  it('rejects oversized CSV files and excessive row counts without writes', async () => {
    const oversized = Buffer.alloc(5_242_881, 65);
    await uploadCsv(oversized).expect(413);
    const header = 'Date,Amount,Category,Type,Currency,Rate,Description';
    const row = `2026-09-01,10,${category.id},EXPENSE,EUR,1,Test`;
    const tooManyRows = [
      header,
      ...Array.from({ length: 10_001 }, () => row),
    ].join('\n');
    const response = await uploadCsv(tooManyRows).expect(400);
    expect(response.body.code).toBe('CSV_ROW_LIMIT');
    expect(records).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });

  it('exports the same filtered owned rows as the list without pagination', async () => {
    for (const description of ['Coffee A', 'Coffee B', 'Tea']) {
      await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/transactions'),
        user,
      )
        .send({
          ...input,
          description,
          currency: 'EUR',
          exchangeRateToBase: '1',
        })
        .expect(201);
    }
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({
        ...input,
        description: 'Coffee outside date range',
        transactionDate: '2026-09-03',
        currency: 'EUR',
        exchangeRateToBase: '1',
      })
      .expect(201);
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      otherUser,
    )
      .send({
        ...input,
        categoryId: otherCategory.id,
        description: 'Coffee foreign',
        currency: 'EUR',
        exchangeRateToBase: '1',
      })
      .expect(201);
    const filters = `search=coffee&categoryId=${category.id}&dateFrom=2026-09-01&dateTo=2026-09-02&minAmount=10&maxAmount=20&type=EXPENSE`;
    const firstPage = await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/transactions?${filters}&page=1&pageSize=1`,
      ),
      user,
    ).expect(200);
    const secondPage = await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/transactions?${filters}&page=2&pageSize=1`,
      ),
      user,
    ).expect(200);
    expect(firstPage.body.meta.total).toBe(2);
    expect(secondPage.body.meta.total).toBe(2);
    const exported = await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/transactions/export?${filters}`,
      ),
      user,
    ).expect(200);
    expect(exported.headers['content-type']).toMatch(/^text\/csv/);
    expect(exported.headers['content-disposition']).toContain(
      'attachment; filename="transactions.csv"',
    );
    const rows = parse(exported.text, { bom: true, columns: true }) as {
      description: string;
    }[];
    const listedDescriptions = [
      ...(firstPage.body.items as { description: string }[]),
      ...(secondPage.body.items as { description: string }[]),
    ].map((item) => item.description);
    expect(rows.map((row) => row.description)).toEqual(listedDescriptions);
    expect(rows).toHaveLength(2);
    expect(listArgs?.take).toBe(500);
  });

  it('streams every row across internal export batches', async () => {
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, currency: 'EUR', exchangeRateToBase: '1' })
      .expect(201);
    const first = records[0];
    for (let index = 2; index <= 501; index += 1) {
      records.push({
        ...first,
        id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}`,
        description: `Export ${index}`,
      });
    }
    const exported = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions/export'),
      user,
    ).expect(200);
    const rows = parse(exported.text, { bom: true, columns: true }) as {
      description: string;
    }[];
    expect(rows).toHaveLength(501);
    expect(rows.map((row) => row.description)).toContain('Export 501');
    expect(rows.map((row) => row.description)).toContain('Coffee');
  });

  it('escapes CSV formula cells and rejects export pagination or missing JWT', async () => {
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      user,
    )
      .send({ ...input, description: '  =HYPERLINK("https://example.test")' })
      .expect(201);
    const exported = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions/export'),
      user,
    ).expect(200);
    const rows = parse(exported.text, { bom: true, columns: true }) as {
      description: string;
    }[];
    expect(rows[0].description).toMatch(/^' {2}=HYPERLINK/);
    await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions/export?page=1'),
      user,
    ).expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/transactions/export')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/transaction-imports')
      .expect(401);
  });

  it('documents both CSV endpoints and their authentication in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(
      response.body.paths['/api/v1/transaction-imports'].post,
    ).toMatchObject({
      security: [{ cookieAuth: [] }],
      responses: { 201: {}, 400: {}, 401: {} },
      requestBody: { content: { 'multipart/form-data': {} } },
    });
    expect(
      response.body.paths['/api/v1/transactions/export'].get,
    ).toMatchObject({
      security: [{ cookieAuth: [] }],
      responses: { 200: {}, 400: {}, 401: {} },
    });
  });
});
