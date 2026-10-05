import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AuditService } from '../../src/audit/audit.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { authenticateRequest } from '../support/authenticate-request.js';
import { createTestApplication } from '../support/create-test-application.js';
import { createTestUser, type TestUserFixture } from '../support/factories.js';

describe('transaction audit with PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: TestUserFixture;
  let otherUser: TestUserFixture;
  let categoryId: string;

  const input = () => ({
    categoryId,
    type: 'EXPENSE',
    amount: '12.3456',
    currency: 'USD',
    exchangeRateToBase: '0.92000000',
    transactionDate: '2026-09-01',
    description: 'Coffee',
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
    await prisma.category.create({
      data: {
        id: categoryId,
        userId: owner.id,
        name: 'Coffee',
        icon: 'coffee',
        color: '#795548',
        type: 'EXPENSE',
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, otherUser.id] } },
    });
  });

  afterAll(async () => app.close());

  it('persists CREATE, UPDATE and DELETE snapshots visible only to the owner', async () => {
    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      owner,
    )
      .send(input())
      .expect(201);
    const id: string = created.body.id;
    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/transactions/${id}`),
      owner,
    )
      .send({ amount: '15.0000', description: 'Lunch' })
      .expect(200);
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/transactions/${id}`),
      owner,
    ).expect(204);

    const entries = await prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(entries).toHaveLength(3);
    const createdEntry = entries.find((entry) => entry.action === 'CREATE');
    const updatedEntry = entries.find((entry) => entry.action === 'UPDATE');
    const deletedEntry = entries.find((entry) => entry.action === 'DELETE');
    const initialSnapshot = {
      id,
      categoryId,
      type: 'EXPENSE',
      amount: '12.3456',
      currency: 'USD',
      exchangeRateToBase: '0.92000000',
      baseAmount: '11.3580',
      transactionDate: '2026-09-01',
      description: 'Coffee',
    };
    const updatedSnapshot = {
      ...initialSnapshot,
      amount: '15.0000',
      baseAmount: '13.8000',
      description: 'Lunch',
    };
    expect(createdEntry).toMatchObject({
      userId: owner.id,
      before: null,
      after: initialSnapshot,
    });
    expect(updatedEntry).toMatchObject({
      userId: owner.id,
      before: initialSnapshot,
      after: updatedSnapshot,
    });
    expect(deletedEntry).toMatchObject({
      userId: owner.id,
      before: updatedSnapshot,
      after: null,
    });
    expect(await prisma.transaction.findUnique({ where: { id } })).toBeNull();

    const ownJournal = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/audit-log?entityType=TRANSACTION',
      ),
      owner,
    ).expect(200);
    expect(ownJournal.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: id, action: 'CREATE' }),
        expect.objectContaining({ entityId: id, action: 'UPDATE' }),
        expect.objectContaining({ entityId: id, action: 'DELETE' }),
      ]),
    );
    expect(ownJournal.body.items).toHaveLength(3);
    expect(ownJournal.body.items[0]).not.toHaveProperty('userId');
    const otherJournal = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/audit-log'),
      otherUser,
    ).expect(200);
    expect(otherJournal.body.items).toEqual([]);
  });

  it('rolls back CREATE, UPDATE and DELETE when audit recording fails', async () => {
    const audit = app.get(AuditService);
    const failNextAudit = () =>
      jest
        .spyOn(audit, 'record')
        .mockRejectedValueOnce(new Error('Audit write failed'));

    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      owner,
    )
      .send(input())
      .expect(500);
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: owner.id } })).toBe(
      0,
    );

    const created = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/transactions'),
      owner,
    )
      .send(input())
      .expect(201);
    const id: string = created.body.id;
    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/transactions/${id}`),
      owner,
    )
      .send({ amount: '99.0000' })
      .expect(500);
    const afterFailedUpdate = await prisma.transaction.findUniqueOrThrow({
      where: { id },
    });
    expect(afterFailedUpdate.amount.toFixed(4)).toBe('12.3456');
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);

    failNextAudit();
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/transactions/${id}`),
      owner,
    ).expect(500);
    expect(
      await prisma.transaction.findUnique({ where: { id } }),
    ).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: id } })).toBe(1);
  });
});
