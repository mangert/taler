import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AuditService } from '../src/audit/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RecurringSchedulerService } from '../src/recurring-transactions/recurring-scheduler.service.js';
import { authenticateRequest } from './support/authenticate-request.js';
import { createTestApplication } from './support/create-test-application.js';
import { createTestUser, type TestUserFixture } from './support/factories.js';

describe('recurring transactions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: TestUserFixture;
  let categoryId: string;
  let otherUserId: string | undefined;

  const input = () => ({
    categoryId,
    type: 'EXPENSE',
    amount: '12.3456',
    currency: 'EUR',
    exchangeRateToBase: '1.00000000',
    dayOfMonth: 31,
    startDate: '2028-02-01',
  });

  beforeAll(async () => {
    app = await createTestApplication({ enableSwagger: true });
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    owner = createTestUser('first', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    categoryId = randomUUID();
    await prisma.user.create({
      data: {
        id: owner.id,
        email: owner.email,
        passwordHash: 'integration-test-hash',
        displayName: owner.displayName,
        baseCurrency: owner.baseCurrency,
        timeZone: owner.timeZone,
      },
    });
    await prisma.category.create({
      data: {
        id: categoryId,
        userId: owner.id,
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#2E7D32',
        type: 'EXPENSE',
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, ...(otherUserId ? [otherUserId] : [])] } },
    });
    otherUserId = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an owned rule with a timezone-aware next run', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send(input())
      .expect(201);

    expect(response.body).toMatchObject({
      categoryId,
      amount: '12.3456',
      nextRunAt: '2028-02-28T23:00:00.000Z',
      isActive: true,
    });
    expect(
      await prisma.recurringTransaction.count({ where: { userId: owner.id } }),
    ).toBe(1);
  });

  it('lists, reads, updates, pauses and deletes only owned rules', async () => {
    const other = createTestUser('second', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    otherUserId = other.id;
    await prisma.user.create({
      data: {
        id: other.id,
        email: other.email,
        passwordHash: 'integration-test-hash',
        displayName: other.displayName,
        baseCurrency: other.baseCurrency,
        timeZone: other.timeZone,
      },
    });
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send(input())
      .expect(201);
    const id: string = created.body.id;
    const url = `/api/v1/recurring-transactions/${id}`;

    await request(app.getHttpServer())
      .get('/api/v1/recurring-transactions')
      .expect(401);
    const list = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/recurring-transactions?page=1&pageSize=10',
      ),
      owner,
    ).expect(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      id,
    ]);
    expect(list.body.meta).toMatchObject({ page: 1, pageSize: 10, total: 1 });
    await authenticateRequest(
      request(app.getHttpServer()).get(url),
      other,
    ).expect(404);
    await authenticateRequest(request(app.getHttpServer()).patch(url), other)
      .send({ isActive: false })
      .expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).delete(url),
      other,
    ).expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).get(url),
      owner,
    ).expect(200);

    const updated = await authenticateRequest(
      request(app.getHttpServer()).patch(url),
      owner,
    )
      .send({ amount: '20.0000', isActive: false, description: 'Paused' })
      .expect(200);
    expect(updated.body).toMatchObject({
      amount: '20.0000',
      isActive: false,
      description: 'Paused',
    });
    expect(
      await prisma.recurringTransaction.count({
        where: { id, isActive: false },
      }),
    ).toBe(1);
    await authenticateRequest(
      request(app.getHttpServer()).delete(url),
      owner,
    ).expect(204);
    await authenticateRequest(
      request(app.getHttpServer()).get(url),
      owner,
    ).expect(404);
  });

  it.each([
    [{ dayOfMonth: 0 }, 'VALIDATION_ERROR'],
    [{ dayOfMonth: 32 }, 'VALIDATION_ERROR'],
    [{ startDate: '2028-02-30' }, 'INVALID_DATE'],
    [{ endDate: '2028-01-31' }, 'INVALID_DATE_RANGE'],
    [{ currency: 'USD', exchangeRateToBase: '0' }, 'INVALID_AMOUNT'],
    [{ exchangeRateToBase: '2.00000000' }, 'INVALID_BASE_CURRENCY_RATE'],
    [{ type: 'INCOME' }, 'CATEGORY_TYPE_MISMATCH'],
  ])('rejects invalid rule fields %j', async (change, code) => {
    const result = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), ...change })
      .expect(400);
    expect(result.body.code).toBe(code);
    expect(
      await prisma.recurringTransaction.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it('rejects a category owned by another user', async () => {
    const other = createTestUser('second', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    otherUserId = other.id;
    await prisma.user.create({
      data: {
        id: other.id,
        email: other.email,
        passwordHash: 'integration-test-hash',
        displayName: other.displayName,
        baseCurrency: other.baseCurrency,
        timeZone: other.timeZone,
      },
    });
    const foreignCategoryId = randomUUID();
    await prisma.category.create({
      data: {
        id: foreignCategoryId,
        userId: other.id,
        name: 'Foreign',
        icon: 'lock',
        color: '#000000',
        type: 'EXPENSE',
      },
    });
    const result = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), categoryId: foreignCategoryId })
      .expect(404);
    expect(result.body.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('catches up missed months exactly once with atomic transaction and audit writes', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({
        ...input(),
        startDate: '2024-01-01',
        currency: 'USD',
        exchangeRateToBase: '0.75000000',
      })
      .expect(201);
    const id: string = created.body.id;
    const now = new Date('2024-04-01T00:00:00.000Z');
    const scheduler = new RecurringSchedulerService(
      prisma,
      app.get(AuditService),
    );

    await Promise.all([scheduler.runDue(now), scheduler.runDue(now)]);
    await scheduler.runDue(now);

    const transactions = await prisma.transaction.findMany({
      where: { recurringTransactionId: id },
      orderBy: { scheduledDate: 'asc' },
    });
    expect(
      transactions.map((item) =>
        item.scheduledDate?.toISOString().slice(0, 10),
      ),
    ).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
    expect(transactions.map((item) => item.baseAmount.toFixed(4))).toEqual([
      '9.2592',
      '9.2592',
      '9.2592',
    ]);
    const audit = await prisma.auditLog.findMany({
      where: { userId: owner.id, entityType: 'TRANSACTION' },
    });
    expect(audit).toHaveLength(3);
    expect(audit.map((entry) => entry.entityId).sort()).toEqual(
      transactions.map((item) => item.id).sort(),
    );
    for (const entry of audit) {
      expect(entry.action).toBe('CREATE');
      expect(entry.before).toBeNull();
      expect(entry.after).toMatchObject({
        id: entry.entityId,
        categoryId,
        amount: '12.3456',
        currency: 'USD',
        exchangeRateToBase: '0.75000000',
        baseAmount: '9.2592',
      });
    }
    const rule = await prisma.recurringTransaction.findUniqueOrThrow({
      where: { id },
    });
    expect(rule.nextRunAt.toISOString()).toBe('2024-04-29T22:00:00.000Z');
  });

  it('keeps generated transactions and audit entries isolated by owner', async () => {
    const other = createTestUser('second', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    otherUserId = other.id;
    const otherCategoryId = randomUUID();
    await prisma.user.create({
      data: {
        id: other.id,
        email: other.email,
        passwordHash: 'integration-test-hash',
        displayName: other.displayName,
        baseCurrency: other.baseCurrency,
        timeZone: other.timeZone,
      },
    });
    await prisma.category.create({
      data: {
        id: otherCategoryId,
        userId: other.id,
        name: 'Other groceries',
        icon: 'shopping-cart',
        color: '#2E7D32',
        type: 'EXPENSE',
      },
    });
    const schedule = {
      ...input(),
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };
    const owned = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...schedule, description: 'Owned occurrence' })
      .expect(201);
    const foreign = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      other,
    )
      .send({
        ...schedule,
        categoryId: otherCategoryId,
        description: 'Foreign occurrence',
      })
      .expect(201);
    const scheduler = new RecurringSchedulerService(
      prisma,
      app.get(AuditService),
    );

    await scheduler.runDue(new Date('2024-02-01T00:00:00.000Z'));

    const ownedTransactions = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions'),
      owner,
    ).expect(200);
    const foreignTransactions = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/transactions'),
      other,
    ).expect(200);
    expect(ownedTransactions.body.items).toHaveLength(1);
    expect(foreignTransactions.body.items).toHaveLength(1);
    expect(ownedTransactions.body.items[0]).toMatchObject({
      description: 'Owned occurrence',
    });
    expect(foreignTransactions.body.items[0]).toMatchObject({
      description: 'Foreign occurrence',
    });
    const generated = await prisma.transaction.findMany({
      where: {
        recurringTransactionId: {
          in: [owned.body.id as string, foreign.body.id as string],
        },
      },
      select: { id: true, userId: true, recurringTransactionId: true },
    });
    expect(generated).toEqual(
      expect.arrayContaining([
        {
          id: ownedTransactions.body.items[0].id,
          userId: owner.id,
          recurringTransactionId: owned.body.id,
        },
        {
          id: foreignTransactions.body.items[0].id,
          userId: other.id,
          recurringTransactionId: foreign.body.id,
        },
      ]),
    );
    await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/transactions/${foreignTransactions.body.items[0].id as string}`,
      ),
      owner,
    ).expect(404);

    for (const [user, transaction] of [
      [owner, ownedTransactions.body.items[0]],
      [other, foreignTransactions.body.items[0]],
    ] as const) {
      const result = await authenticateRequest(
        request(app.getHttpServer()).get(
          '/api/v1/audit-log?entityType=TRANSACTION',
        ),
        user,
      ).expect(200);
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0]).toMatchObject({
        entityId: transaction.id,
        action: 'CREATE',
      });
    }
  });

  it('rolls back transaction and schedule advancement when audit creation fails', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), startDate: '2024-01-01' })
      .expect(201);
    const id: string = created.body.id;
    const nextRunAt: string = created.body.nextRunAt;
    const audit = app.get(AuditService);
    jest
      .spyOn(audit, 'record')
      .mockRejectedValueOnce(new Error('simulated audit failure'));
    const scheduler = new RecurringSchedulerService(prisma, audit);

    await expect(
      scheduler.runDue(new Date('2024-02-01T00:00:00.000Z')),
    ).rejects.toThrow('simulated audit failure');
    expect(
      await prisma.transaction.count({ where: { recurringTransactionId: id } }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );
    const rule = await prisma.recurringTransaction.findUniqueOrThrow({
      where: { id },
    });
    expect(rule.nextRunAt.toISOString()).toBe(nextRunAt);
  });

  it('advances a stale occurrence without creating a duplicate or audit entry', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), startDate: '2024-01-01' })
      .expect(201);
    const id: string = created.body.id;
    await prisma.transaction.create({
      data: {
        userId: owner.id,
        categoryId,
        type: 'EXPENSE',
        amount: '12.3456',
        currency: 'EUR',
        exchangeRateToBase: '1',
        baseAmount: '12.3456',
        transactionDate: new Date('2024-01-31T00:00:00.000Z'),
        recurringTransactionId: id,
        scheduledDate: new Date('2024-01-31T00:00:00.000Z'),
      },
    });
    const scheduler = new RecurringSchedulerService(
      prisma,
      app.get(AuditService),
    );
    await scheduler.runDue(new Date('2024-02-01T00:00:00.000Z'));

    expect(
      await prisma.transaction.count({ where: { recurringTransactionId: id } }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );
    const rule = await prisma.recurringTransaction.findUniqueOrThrow({
      where: { id },
    });
    expect(rule.nextRunAt.toISOString()).toBe('2024-02-28T23:00:00.000Z');
  });

  it('stops after the inclusive end date', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), startDate: '2024-01-01', endDate: '2024-01-31' })
      .expect(201);
    const id: string = created.body.id;
    const scheduler = new RecurringSchedulerService(
      prisma,
      app.get(AuditService),
    );
    await scheduler.runDue(new Date('2024-04-01T00:00:00.000Z'));

    expect(
      await prisma.transaction.count({ where: { recurringTransactionId: id } }),
    ).toBe(1);
    const rule = await prisma.recurringTransaction.findUniqueOrThrow({
      where: { id },
    });
    expect(rule.isActive).toBe(false);
  });

  it('rejects null required fields and accepts clearing nullable fields', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send({ ...input(), description: 'Monthly', endDate: '2028-12-31' })
      .expect(201);
    const url = `/api/v1/recurring-transactions/${created.body.id as string}`;
    const invalid = await authenticateRequest(
      request(app.getHttpServer()).patch(url),
      owner,
    )
      .send({ amount: null })
      .expect(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
    const cleared = await authenticateRequest(
      request(app.getHttpServer()).patch(url),
      owner,
    )
      .send({ description: null, endDate: null, dayOfMonth: 30 })
      .expect(200);
    expect(cleared.body).toMatchObject({
      description: null,
      endDate: null,
      dayOfMonth: 30,
      nextRunAt: '2028-02-28T23:00:00.000Z',
    });
  });

  it('moves the next run when the profile timezone changes and locks base currency', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/recurring-transactions'),
      owner,
    )
      .send(input())
      .expect(201);
    const locked = await authenticateRequest(
      request(app.getHttpServer()).patch('/api/v1/users/me'),
      owner,
    )
      .send({ baseCurrency: 'USD' })
      .expect(409);
    expect(locked.body.code).toBe('BASE_CURRENCY_LOCKED');
    const changed = await authenticateRequest(
      request(app.getHttpServer()).patch('/api/v1/users/me'),
      owner,
    )
      .send({ timeZone: 'America/New_York' })
      .expect(200);
    expect(changed.body.timeZone).toBe('America/New_York');
    const rule = await prisma.recurringTransaction.findUniqueOrThrow({
      where: { id: created.body.id as string },
    });
    expect(rule.nextRunAt.toISOString()).toBe('2028-02-29T05:00:00.000Z');
  });

  it('documents optional fields and calendar dates correctly in OpenAPI', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const schemas = result.body.components.schemas;
    expect(schemas.CreateRecurringTransactionDto.required).not.toContain(
      'isActive',
    );
    expect(schemas.UpdateRecurringTransactionDto.required ?? []).not.toContain(
      'isActive',
    );
    expect(
      schemas.CreateRecurringTransactionDto.properties.endDate,
    ).toMatchObject({
      type: 'string',
      format: 'date',
      nullable: true,
    });
  });
});
