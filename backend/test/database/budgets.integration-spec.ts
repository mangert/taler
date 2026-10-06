import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AuditService } from '../../src/audit/audit.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { authenticateRequest } from '../support/authenticate-request.js';
import { createTestApplication } from '../support/create-test-application.js';
import { createTestUser, type TestUserFixture } from '../support/factories.js';

describe('budgets with PostgreSQL (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: TestUserFixture;
  let otherUser: TestUserFixture;
  let expenseCategoryId: string;
  let secondExpenseCategoryId: string;
  let foreignCategoryId: string;
  let incomeCategoryId: string;

  const budgetInput = () => ({
    categoryId: expenseCategoryId,
    month: '2026-09-01',
    limitAmount: '100.0000',
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
    otherUser = createTestUser('second', {
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    });
    expenseCategoryId = randomUUID();
    secondExpenseCategoryId = randomUUID();
    foreignCategoryId = randomUUID();
    incomeCategoryId = randomUUID();
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
          id: expenseCategoryId,
          userId: owner.id,
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#2E7D32',
          type: 'EXPENSE',
        },
        {
          id: incomeCategoryId,
          userId: owner.id,
          name: 'Salary',
          icon: 'account-balance',
          color: '#1976D2',
          type: 'INCOME',
        },
        {
          id: secondExpenseCategoryId,
          userId: owner.id,
          name: 'Travel',
          icon: 'train',
          color: '#00897B',
          type: 'EXPENSE',
        },
        {
          id: foreignCategoryId,
          userId: otherUser.id,
          name: 'Other groceries',
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

  it('creates an owned budget with base-currency progress and a CREATE audit snapshot', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    expect(response.body).toMatchObject({
      categoryId: expenseCategoryId,
      month: '2026-09-01',
      limitAmount: '100.0000',
      currency: 'EUR',
      spentAmount: '0.0000',
      remainingAmount: '100.0000',
      progressPercent: 0,
      isExceeded: false,
    });
    expect(response.body).not.toHaveProperty('userId');
    const budget = await prisma.budget.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(budget.userId).toBe(owner.id);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: budget.id, userId: owner.id },
    });
    expect(audit).toMatchObject({
      entityType: 'BUDGET',
      action: 'CREATE',
      before: null,
      after: {
        id: budget.id,
        categoryId: expenseCategoryId,
        month: '2026-09-01',
        limitAmount: '100.0000',
      },
    });
  });

  it('lists only owned monthly budgets and calculates progress from baseAmount on both month boundaries', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const foreignBudget = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      otherUser,
    )
      .send({ ...budgetInput(), categoryId: foreignCategoryId })
      .expect(201);
    await prisma.transaction.createMany({
      data: [
        ['2026-08-31', '90.0000', 'EUR', '1.00000000', '90.0000'],
        ['2026-09-01', '40.0000', 'USD', '0.75000000', '30.0000'],
        ['2026-09-30', '80.0000', 'EUR', '1.00000000', '80.0000'],
        ['2026-10-01', '40.0000', 'EUR', '1.00000000', '40.0000'],
      ].map(([date, amount, currency, rate, baseAmount]) => ({
        id: randomUUID(),
        userId: owner.id,
        categoryId: expenseCategoryId,
        type: 'EXPENSE' as const,
        amount,
        currency,
        exchangeRateToBase: rate,
        baseAmount,
        transactionDate: new Date(date + 'T00:00:00.000Z'),
        description: 'Foreign-currency spending',
      })),
    });

    const list = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/budgets?month=2026-09-01&page=1&pageSize=1',
      ),
      owner,
    ).expect(200);
    expect(list.body.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      id: created.body.id,
      currency: 'EUR',
      spentAmount: '110.0000',
      remainingAmount: '-10.0000',
      progressPercent: 110,
      isExceeded: true,
    });
    const detail = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${created.body.id}`),
      owner,
    ).expect(200);
    expect(detail.body).toMatchObject(list.body.items[0]);
    await authenticateRequest(
      request(app.getHttpServer()).get(
        `/api/v1/budgets/${foreignBudget.body.id}`,
      ),
      owner,
    ).expect(404);
  });

  it('updates all editable fields and deletes a budget with exact UPDATE and DELETE audit snapshots', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const id: string = created.body.id;
    const updated = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/budgets/${id}`),
      owner,
    )
      .send({
        categoryId: secondExpenseCategoryId,
        month: '2026-10-01',
        limitAmount: '75.2500',
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      id,
      categoryId: secondExpenseCategoryId,
      month: '2026-10-01',
      limitAmount: '75.2500',
      currency: 'EUR',
    });
    const before = {
      id,
      categoryId: expenseCategoryId,
      month: '2026-09-01',
      limitAmount: '100.0000',
    };
    const after = {
      id,
      categoryId: secondExpenseCategoryId,
      month: '2026-10-01',
      limitAmount: '75.2500',
    };
    const updateAudit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: id, action: 'UPDATE' },
    });
    expect(updateAudit).toMatchObject({
      userId: owner.id,
      entityType: 'BUDGET',
      before,
      after,
    });
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/budgets/${id}`),
      owner,
    ).expect(204);
    expect(await prisma.budget.findUnique({ where: { id } })).toBeNull();
    const deleteAudit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: id, action: 'DELETE' },
    });
    expect(deleteAudit).toMatchObject({
      userId: owner.id,
      entityType: 'BUDGET',
      before: after,
      after: null,
    });
    await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${id}`),
      owner,
    ).expect(404);
  });

  it('rejects invalid month, limit, unknown fields, and non-expense or foreign categories', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .send(budgetInput())
      .expect(401);
    for (const body of [
      { ...budgetInput(), month: '2026-09-02' },
      { ...budgetInput(), limitAmount: '0' },
      { ...budgetInput(), limitAmount: '-1' },
      { ...budgetInput(), limitAmount: '1.00001' },
      { ...budgetInput(), userId: otherUser.id },
      { ...budgetInput(), categoryId: incomeCategoryId },
    ]) {
      const response = await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/budgets'),
        owner,
      )
        .send(body)
        .expect(400);
      expect(response.body.code).toBeDefined();
    }
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send({ ...budgetInput(), categoryId: foreignCategoryId })
      .expect(404);
    for (const query of ['?month=2026-09-02', '?page=0', '?pageSize=101']) {
      await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/budgets' + query),
        owner,
      ).expect(400);
    }
    expect(await prisma.budget.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );
  });

  it('rejects duplicate category-month budgets on create and update without adding audit entries', async () => {
    const first = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const duplicate = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(409);
    expect(duplicate.body.code).toBe('BUDGET_EXISTS');
    const second = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send({ ...budgetInput(), month: '2026-10-01' })
      .expect(201);
    const update = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/budgets/${second.body.id}`),
      owner,
    )
      .send({ month: '2026-09-01' })
      .expect(409);
    expect(update.body.code).toBe('BUDGET_EXISTS');
    const unchanged = await prisma.budget.findUniqueOrThrow({
      where: { id: second.body.id },
    });
    expect(unchanged.month.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      2,
    );
    expect(first.body.id).not.toBe(second.body.id);
  });

  it('hides foreign budgets from reads, updates and deletes', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const id: string = created.body.id;
    await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${id}`),
      otherUser,
    ).expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/budgets/${id}`),
      otherUser,
    )
      .send({ limitAmount: '1.0000' })
      .expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/budgets/${id}`),
      otherUser,
    ).expect(404);
    const foreignList = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/budgets?month=2026-09-01'),
      otherUser,
    ).expect(200);
    expect(foreignList.body.items).toEqual([]);
    expect(await prisma.budget.findUnique({ where: { id } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);
  });

  it('rolls back CREATE, UPDATE and DELETE when audit recording fails', async () => {
    const audit = app.get(AuditService);
    const failNextAudit = () =>
      jest
        .spyOn(audit, 'record')
        .mockRejectedValueOnce(new Error('Audit write failed'));
    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(500);
    expect(await prisma.budget.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );

    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const id: string = created.body.id;
    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/budgets/${id}`),
      owner,
    )
      .send({ limitAmount: '200.0000' })
      .expect(500);
    const unchanged = await prisma.budget.findUniqueOrThrow({ where: { id } });
    expect(unchanged.limitAmount.toFixed(4)).toBe('100.0000');
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);

    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/budgets/${id}`),
      owner,
    ).expect(500);
    expect(await prisma.budget.findUnique({ where: { id } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);
  });

  it('keeps the base currency fixed while a budget uses it', async () => {
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const response = await authenticateRequest(
      request(app.getHttpServer()).patch('/api/v1/users/me'),
      owner,
    )
      .send({ baseCurrency: 'USD', displayName: 'Changed name' })
      .expect(409);
    expect(response.body.code).toBe('BASE_CURRENCY_LOCKED');
    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { id: owner.id },
    });
    expect(unchanged.baseCurrency).toBe('EUR');
    expect(unchanged.displayName).toBe(owner.displayName);
  });

  it('does not let a category with a budget become an income category', async () => {
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const response = await authenticateRequest(
      request(app.getHttpServer()).patch(
        `/api/v1/categories/${expenseCategoryId}`,
      ),
      owner,
    )
      .send({ type: 'INCOME' })
      .expect(409);
    expect(response.body.code).toBe('CATEGORY_IN_USE');
    const category = await prisma.category.findUniqueOrThrow({
      where: { id: expenseCategoryId },
    });
    expect(category.type).toBe('EXPENSE');
  });

  it('recalculates budget progress after expense HTTP creation and deletion', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const expense = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      owner,
    )
      .send({
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: '40.0000',
        currency: 'USD',
        exchangeRateToBase: '0.75000000',
        transactionDate: '2026-09-15',
        description: 'Budget progress integration',
      })
      .expect(201);
    expect(expense.body.baseAmount).toBe('30.0000');
    const afterCreate = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${created.body.id}`),
      owner,
    ).expect(200);
    expect(afterCreate.body).toMatchObject({
      spentAmount: '30.0000',
      remainingAmount: '70.0000',
      progressPercent: 30,
      isExceeded: false,
    });
    await authenticateRequest(
      request(app.getHttpServer()).delete(
        `/api/v1/transactions/${expense.body.id}`,
      ),
      owner,
    ).expect(204);
    const afterDelete = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${created.body.id}`),
      owner,
    ).expect(200);
    expect(afterDelete.body).toMatchObject({
      spentAmount: '0.0000',
      remainingAmount: '100.0000',
      progressPercent: 0,
      isExceeded: false,
    });
  });

  it('rounds progress to two decimal places and does not mark an exact limit as exceeded', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send({ ...budgetInput(), limitAmount: '3' })
      .expect(201);
    await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId: owner.id,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: '1.0000',
        currency: 'EUR',
        exchangeRateToBase: '1.00000000',
        baseAmount: '1.0000',
        transactionDate: new Date('2026-09-15T00:00:00.000Z'),
      },
    });
    const detail = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/budgets/${created.body.id}`),
      owner,
    ).expect(200);
    expect(detail.body).toMatchObject({
      limitAmount: '3.0000',
      spentAmount: '1.0000',
      remainingAmount: '2.0000',
      progressPercent: 33.33,
      isExceeded: false,
    });
    const exact = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/budgets/${created.body.id}`),
      owner,
    )
      .send({ limitAmount: '1' })
      .expect(200);
    expect(exact.body).toMatchObject({
      spentAmount: '1.0000',
      remainingAmount: '0.0000',
      progressPercent: 100,
      isExceeded: false,
    });
  });

  it('paginates a monthly budget list in a deterministic order', async () => {
    const first = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send(budgetInput())
      .expect(201);
    const second = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/budgets'),
      owner,
    )
      .send({ ...budgetInput(), categoryId: secondExpenseCategoryId })
      .expect(201);
    const page = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/budgets?month=2026-09-01&page=2&pageSize=1',
      ),
      owner,
    ).expect(200);
    expect(page.body.meta).toEqual({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    const ordered = [first.body, second.body].sort(
      (left, right) =>
        left.categoryId.localeCompare(right.categoryId) ||
        left.id.localeCompare(right.id),
    );
    expect(page.body.items).toEqual([
      expect.objectContaining({ id: ordered[1].id }),
    ]);
  });

  it('documents protected CRUD, month, monetary and progress fields in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths).toMatchObject({
      '/api/v1/budgets': {
        get: {
          security: [{ cookieAuth: [] }],
          responses: { 200: {}, 400: {}, 401: {} },
        },
        post: {
          security: [{ cookieAuth: [] }],
          responses: { 201: {}, 400: {}, 404: {}, 409: {} },
        },
      },
      '/api/v1/budgets/{id}': {
        get: { responses: { 200: {}, 404: {} } },
        patch: { responses: { 200: {}, 400: {}, 404: {}, 409: {} } },
        delete: { responses: { 204: {}, 404: {} } },
      },
    });
    expect(response.body.components.schemas.CreateBudgetDto.required).toEqual(
      expect.arrayContaining(['categoryId', 'month', 'limitAmount']),
    );
    expect(
      response.body.components.schemas.BudgetResponseDto.properties,
    ).toMatchObject({
      currency: {},
      spentAmount: {},
      remainingAmount: {},
      progressPercent: {},
      isExceeded: {},
    });
  });
});
