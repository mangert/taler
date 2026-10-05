import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AuditAction,
  AuditableEntityType,
  type AuditLog,
} from '../src/generated/prisma/client.js';
import { DatabaseHealthIndicator } from '../src/health/database-health.indicator.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { authenticateRequest } from './support/authenticate-request.js';
import { createTestApplication } from './support/create-test-application.js';
import { createTestUser } from './support/factories.js';

const user = createTestUser('first');
const otherUser = createTestUser('second');
const entityId = '40000000-0000-4000-8000-000000000001';

type AuditWhere = {
  userId: string;
  entityType?: AuditableEntityType;
  action?: AuditAction;
  createdAt?: { gte?: Date; lt?: Date };
};

const auditRecords: AuditLog[] = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    userId: user.id,
    entityType: AuditableEntityType.TRANSACTION,
    entityId,
    action: AuditAction.UPDATE,
    before: { amount: '12.0000' },
    after: { amount: '13.0000' },
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    userId: user.id,
    entityType: AuditableEntityType.TRANSACTION,
    entityId,
    action: AuditAction.UPDATE,
    before: { amount: '13.0000' },
    after: { amount: '14.0000' },
    createdAt: new Date('2026-09-02T23:59:59.000Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    userId: user.id,
    entityType: AuditableEntityType.BUDGET,
    entityId: '30000000-0000-4000-8000-000000000001',
    action: AuditAction.CREATE,
    before: null,
    after: { limitAmount: '30000.0000' },
    createdAt: new Date('2026-09-01T13:00:00.000Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000004',
    userId: otherUser.id,
    entityType: AuditableEntityType.TRANSACTION,
    entityId,
    action: AuditAction.UPDATE,
    before: { amount: '1.0000' },
    after: { amount: '2.0000' },
    createdAt: new Date('2026-09-02T15:00:00.000Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000005',
    userId: user.id,
    entityType: AuditableEntityType.TRANSACTION,
    entityId,
    action: AuditAction.DELETE,
    before: { amount: '14.0000' },
    after: null,
    createdAt: new Date('2026-09-03T09:00:00.000Z'),
  },
];

const matching = (where: AuditWhere): AuditLog[] =>
  auditRecords.filter(
    (record) =>
      record.userId === where.userId &&
      (!where.entityType || record.entityType === where.entityType) &&
      (!where.action || record.action === where.action) &&
      (!where.createdAt?.gte || record.createdAt >= where.createdAt.gte) &&
      (!where.createdAt?.lt || record.createdAt < where.createdAt.lt),
  );

describe('audit log (e2e)', () => {
  let app: INestApplication;
  let lastWhere: AuditWhere | undefined;

  beforeEach(async () => {
    lastWhere = undefined;
    const prisma = {
      auditLog: {
        findMany: async ({
          where,
          skip,
          take,
        }: {
          where: AuditWhere;
          skip: number;
          take: number;
        }) => {
          lastWhere = where;
          return matching(where)
            .sort(
              (first, second) =>
                second.createdAt.getTime() - first.createdAt.getTime() ||
                second.id.localeCompare(first.id),
            )
            .slice(skip, skip + take);
        },
        count: async ({ where }: { where: AuditWhere }) =>
          matching(where).length,
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

  it('requires authentication for the audit log', async () => {
    await request(app.getHttpServer()).get('/api/v1/audit-log').expect(401);
  });

  it('filters owned entries by entity, action and inclusive UTC dates with pagination', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/audit-log?entityType=TRANSACTION&action=UPDATE&dateFrom=2026-09-01&dateTo=2026-09-02&page=1&pageSize=1',
      ),
      user,
    ).expect(200);

    expect(response.body).toEqual({
      items: [
        {
          id: '60000000-0000-4000-8000-000000000002',
          entityType: 'TRANSACTION',
          entityId,
          action: 'UPDATE',
          before: { amount: '13.0000' },
          after: { amount: '14.0000' },
          createdAt: '2026-09-02T23:59:59.000Z',
        },
      ],
      meta: { page: 1, pageSize: 1, total: 2, totalPages: 2 },
    });
    expect(lastWhere).toEqual({
      userId: user.id,
      entityType: 'TRANSACTION',
      action: 'UPDATE',
      createdAt: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lt: new Date('2026-09-03T00:00:00.000Z'),
      },
    });
  });

  it('returns only current user entries in deterministic pages', async () => {
    const first = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/audit-log?pageSize=2'),
      user,
    ).expect(200);
    expect(first.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 4,
      totalPages: 2,
    });
    expect(first.body.items.map((entry: { id: string }) => entry.id)).toEqual([
      '60000000-0000-4000-8000-000000000005',
      '60000000-0000-4000-8000-000000000002',
    ]);
    expect(first.body.items[0]).not.toHaveProperty('userId');

    const second = await authenticateRequest(
      request(app.getHttpServer()).get('/api/v1/audit-log?page=2&pageSize=2'),
      user,
    ).expect(200);
    expect(second.body.items.map((entry: { id: string }) => entry.id)).toEqual([
      '60000000-0000-4000-8000-000000000003',
      '60000000-0000-4000-8000-000000000001',
    ]);
  });

  it('rejects invalid filters, calendar dates, pagination and owner input', async () => {
    for (const query of [
      '?entityType=USER',
      '?action=READ',
      '?dateFrom=2026-02-30',
      '?dateFrom=2026-09-03&dateTo=2026-09-01',
      '?page=0',
      '?pageSize=101',
      `?userId=${otherUser.id}`,
    ]) {
      await authenticateRequest(
        request(app.getHttpServer()).get('/api/v1/audit-log' + query),
        user,
      ).expect(400);
    }
  });

  it('does not expose audit mutation routes', async () => {
    const path = '/api/v1/audit-log/60000000-0000-4000-8000-000000000001';
    await authenticateRequest(request(app.getHttpServer()).patch(path), user)
      .send({ action: 'DELETE' })
      .expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).delete(path),
      user,
    ).expect(404);
  });

  it('documents the protected read-only audit contract in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const route = response.body.paths['/api/v1/audit-log'] as Record<
      string,
      unknown
    >;
    expect(Object.keys(route)).toEqual(['get']);
    expect(route.get).toMatchObject({
      security: [{ cookieAuth: [] }],
      responses: { 200: {}, 400: {}, 401: {} },
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: 'entityType', in: 'query' }),
        expect.objectContaining({ name: 'action', in: 'query' }),
        expect.objectContaining({ name: 'dateFrom', in: 'query' }),
        expect.objectContaining({ name: 'dateTo', in: 'query' }),
      ]),
    });
    expect(
      response.body.components.schemas.AuditLogResponseDto.properties,
    ).not.toHaveProperty('userId');
  });
});
