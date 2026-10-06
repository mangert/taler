import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { DashboardClock } from '../../src/dashboard/dashboard.clock.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { authenticateRequest } from '../support/authenticate-request.js';
import { createTestApplication } from '../support/create-test-application.js';
import {
  createTestUser,
  type TestTransactionType,
  type TestUserFixture,
} from '../support/factories.js';

describe('dashboard with PostgreSQL (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: TestUserFixture;
  let otherUser: TestUserFixture;

  beforeAll(async () => {
    app = await createTestApplication({
      enableSwagger: true,
      configureModule: (moduleBuilder) =>
        moduleBuilder.overrideProvider(DashboardClock).useValue({
          now: () => new Date('2026-09-30T23:30:00.000Z'),
        }),
    });
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
      timeZone: 'America/Los_Angeles',
    });
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
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, otherUser.id] } },
    });
  });

  afterAll(async () => app.close());

  it('returns six zero-filled months and no categories when the owner has no transactions', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/dashboard'),
      owner,
    ).expect(200);

    expect(response.body).toMatchObject({
      currency: 'EUR',
      months: 6,
      fromMonth: '2026-05-01',
      toMonth: '2026-10-01',
      totals: {
        income: '0.0000',
        expense: '0.0000',
        balance: '0.0000',
      },
      expensesByCategory: [],
      topCategories: [],
    });
    expect(response.body.monthlySeries).toEqual(
      [
        '2026-05-01',
        '2026-06-01',
        '2026-07-01',
        '2026-08-01',
        '2026-09-01',
        '2026-10-01',
      ].map((month) => ({ month, income: '0.0000', expense: '0.0000' })),
    );
  });

  it('aggregates base-currency totals, monthly series and top five for only the owner', async () => {
    const ids = {
      alpha: randomUUID(),
      beta: randomUUID(),
      gamma: randomUUID(),
      delta: randomUUID(),
      epsilon: randomUUID(),
      zeta: randomUUID(),
      salary: randomUUID(),
      foreign: randomUUID(),
    };
    const category = (
      id: string,
      userId: string,
      name: string,
      type: TestTransactionType = 'EXPENSE',
    ) => ({ id, userId, name, type, icon: 'category', color: '#2E7D32' });
    await prisma.category.createMany({
      data: [
        category(ids.alpha, owner.id, 'Alpha'),
        category(ids.beta, owner.id, 'Beta'),
        category(ids.gamma, owner.id, 'Gamma'),
        category(ids.delta, owner.id, 'Delta'),
        category(ids.epsilon, owner.id, 'Epsilon'),
        category(ids.zeta, owner.id, 'Zeta'),
        category(ids.salary, owner.id, 'Salary', 'INCOME'),
        category(ids.foreign, otherUser.id, 'Foreign'),
      ],
    });
    const transaction = (
      userId: string,
      categoryId: string,
      type: TestTransactionType,
      date: string,
      baseAmount: string,
      amount = baseAmount,
      currency = 'EUR',
      exchangeRateToBase = '1.00000000',
    ) => ({
      id: randomUUID(),
      userId,
      categoryId,
      type,
      amount,
      currency,
      exchangeRateToBase,
      baseAmount,
      transactionDate: new Date(`${date}T00:00:00.000Z`),
    });
    await prisma.transaction.createMany({
      data: [
        transaction(owner.id, ids.salary, 'INCOME', '2026-05-01', '100.0000'),
        transaction(owner.id, ids.alpha, 'EXPENSE', '2026-05-01', '30.0000'),
        transaction(owner.id, ids.beta, 'EXPENSE', '2026-05-01', '15.0000'),
        transaction(owner.id, ids.gamma, 'EXPENSE', '2026-05-01', '10.0000'),
        transaction(owner.id, ids.delta, 'EXPENSE', '2026-05-01', '8.0000'),
        transaction(owner.id, ids.epsilon, 'EXPENSE', '2026-05-01', '7.0000'),
        transaction(owner.id, ids.zeta, 'EXPENSE', '2026-05-01', '7.0000'),
        transaction(owner.id, ids.salary, 'INCOME', '2026-07-15', '50.0000'),
        transaction(owner.id, ids.alpha, 'EXPENSE', '2026-07-15', '20.0000'),
        transaction(
          owner.id,
          ids.beta,
          'EXPENSE',
          '2026-08-31',
          '3.0000',
          '4.5000',
          'USD',
          '0.66666667',
        ),
        transaction(owner.id, ids.salary, 'INCOME', '2026-09-30', '20.0000'),
        transaction(owner.id, ids.zeta, 'EXPENSE', '2026-09-30', '1.0000'),
        transaction(owner.id, ids.alpha, 'EXPENSE', '2026-10-01', '2.0000'),
        transaction(owner.id, ids.alpha, 'EXPENSE', '2026-04-30', '1000.0000'),
        transaction(owner.id, ids.alpha, 'EXPENSE', '2026-11-01', '1000.0000'),
        transaction(
          otherUser.id,
          ids.foreign,
          'EXPENSE',
          '2026-09-30',
          '9.0000',
        ),
        transaction(
          otherUser.id,
          ids.foreign,
          'EXPENSE',
          '2026-10-01',
          '10000.0000',
        ),
      ],
    });

    const response = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/dashboard?months=6'),
      owner,
    ).expect(200);
    expect(response.body).toMatchObject({
      currency: 'EUR',
      months: 6,
      fromMonth: '2026-05-01',
      toMonth: '2026-10-01',
      totals: {
        income: '170.0000',
        expense: '103.0000',
        balance: '67.0000',
      },
    });
    expect(response.body.monthlySeries).toEqual([
      { month: '2026-05-01', income: '100.0000', expense: '77.0000' },
      { month: '2026-06-01', income: '0.0000', expense: '0.0000' },
      { month: '2026-07-01', income: '50.0000', expense: '20.0000' },
      { month: '2026-08-01', income: '0.0000', expense: '3.0000' },
      { month: '2026-09-01', income: '20.0000', expense: '1.0000' },
      { month: '2026-10-01', income: '0.0000', expense: '2.0000' },
    ]);
    const expectedCategories = [
      [ids.alpha, 'Alpha', '52.0000'],
      [ids.beta, 'Beta', '18.0000'],
      [ids.gamma, 'Gamma', '10.0000'],
      [ids.delta, 'Delta', '8.0000'],
      [ids.zeta, 'Zeta', '8.0000'],
      [ids.epsilon, 'Epsilon', '7.0000'],
    ].map(([categoryId, categoryName, amount]) => ({
      categoryId,
      categoryName,
      color: '#2E7D32',
      amount,
    }));
    expect(response.body.expensesByCategory).toEqual(expectedCategories);
    expect(response.body.topCategories).toEqual(expectedCategories.slice(0, 5));

    const oneMonth = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/dashboard?months=1'),
      owner,
    ).expect(200);
    expect(oneMonth.body).toMatchObject({
      fromMonth: '2026-10-01',
      toMonth: '2026-10-01',
      totals: {
        income: '0.0000',
        expense: '2.0000',
        balance: '-2.0000',
      },
    });
    expect(oneMonth.body.monthlySeries).toEqual([
      { month: '2026-10-01', income: '0.0000', expense: '2.0000' },
    ]);

    const foreign = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/dashboard?months=1'),
      otherUser,
    ).expect(200);
    expect(foreign.body).toMatchObject({
      fromMonth: '2026-09-01',
      toMonth: '2026-09-01',
      totals: {
        income: '0.0000',
        expense: '9.0000',
        balance: '-9.0000',
      },
      expensesByCategory: [
        {
          categoryId: ids.foreign,
          categoryName: 'Foreign',
          color: '#2E7D32',
          amount: '9.0000',
        },
      ],
      topCategories: [
        {
          categoryId: ids.foreign,
          amount: '9.0000',
        },
      ],
    });
  });

  it('requires authentication and validates the requested number of months', async () => {
    await request(app.getHttpServer()).get('/api/v1/dashboard').expect(401);
    for (const query of [
      '?months=0',
      '?months=13',
      '?months=abc',
      '?months=2.5',
      '?months=',
      '?months=6&userId=someone-else',
    ]) {
      const response = await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/dashboard' + query),
        owner,
      ).expect(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('documents the protected dashboard contract in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths['/api/v1/dashboard'].get).toMatchObject({
      security: [{ cookieAuth: [] }],
      responses: { 200: {}, 400: {}, 401: {} },
    });
    expect(
      response.body.components.schemas.DashboardResponseDto.properties,
    ).toMatchObject({
      currency: {},
      months: {},
      fromMonth: {},
      toMonth: {},
      totals: {},
      expensesByCategory: {},
      monthlySeries: {},
      topCategories: {},
    });
  });
});
