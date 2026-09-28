import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
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

describe('transactions (e2e)', () => {
  let app: INestApplication;
  let created: Record<string, unknown> | undefined;
  let records: TransactionRecord[];
  let listArgs:
    { where: Where; skip: number; take: number; orderBy: unknown } | undefined;

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
    listArgs = undefined;
    const prisma = {
      user: { findUnique: async () => ({ baseCurrency: 'EUR' }) },
      category: {
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
          skip: number;
          take: number;
          orderBy: unknown;
        }) => {
          listArgs = args;
          return records
            .filter((record) => matches(record, args.where))
            .sort(
              (a, b) =>
                b.transactionDate.getTime() - a.transactionDate.getTime() ||
                b.id.localeCompare(a.id),
            )
            .slice(args.skip, args.skip + args.take);
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
          const record = records.find((candidate) => matches(candidate, where));
          if (!record) throw new Error('Missing record');
          Object.assign(record, data);
          return record;
        },
        delete: async ({ where }: { where: Where }) => {
          const index = records.findIndex((record) => matches(record, where));
          if (index < 0) throw new Error('Missing record');
          return records.splice(index, 1)[0];
        },
      },
    };
    app = await createTestApplication({
      enableSwagger: true,
      configureModule: (builder) =>
        builder
          .overrideProvider(DatabaseHealthIndicator)
          .useValue({ check: async (): Promise<void> => undefined })
          .overrideProvider(PrismaService)
          .useValue(prisma),
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
});
