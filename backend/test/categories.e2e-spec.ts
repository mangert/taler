import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseHealthIndicator } from '../src/health/database-health.indicator.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { authenticateRequest } from './support/authenticate-request.js';
import { createTestUser } from './support/factories.js';
import { createTestApplication } from './support/create-test-application.js';

interface CategoryRecord {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryWhere {
  id?: string;
  userId?: string;
  name?: { equals?: string; contains?: string; mode?: string };
  NOT?: { id: string };
}

class CategoryPrismaFake {
  private readonly records: CategoryRecord[] = [];
  private readonly usage = {
    transaction: new Set<string>(),
    budget: new Set<string>(),
    recurringTransaction: new Set<string>(),
  };

  private matches(record: CategoryRecord, where: CategoryWhere): boolean {
    if (where.id && record.id !== where.id) return false;
    if (where.userId && record.userId !== where.userId) return false;
    if (where.NOT?.id === record.id) return false;
    if (where.name?.equals) {
      if (record.name.toLowerCase() !== where.name.equals.toLowerCase())
        return false;
    }
    if (where.name?.contains) {
      if (
        !record.name.toLowerCase().includes(where.name.contains.toLowerCase())
      )
        return false;
    }
    return true;
  }

  readonly category = {
    findMany: async (args: {
      where: CategoryWhere;
      skip: number;
      take: number;
    }): Promise<CategoryRecord[]> =>
      this.records
        .filter((record) => this.matches(record, args.where))
        .sort(
          (left, right) =>
            left.name.localeCompare(right.name) ||
            left.id.localeCompare(right.id),
        )
        .slice(args.skip, args.skip + args.take),
    count: async (args: { where: CategoryWhere }): Promise<number> =>
      this.records.filter((record) => this.matches(record, args.where)).length,
    findFirst: async (args: {
      where: CategoryWhere;
    }): Promise<CategoryRecord | null> =>
      this.records.find((record) => this.matches(record, args.where)) ?? null,
    create: async (args: {
      data: Omit<CategoryRecord, 'id' | 'createdAt' | 'updatedAt'>;
    }): Promise<CategoryRecord> => {
      const timestamp = new Date('2026-09-22T10:00:00.000Z');
      const record: CategoryRecord = {
        id: `30000000-0000-4000-8000-${String(this.records.length + 1).padStart(12, '0')}`,
        ...args.data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.records.push(record);
      return { ...record };
    },
    update: async (args: {
      where: { id: string; userId: string };
      data: Partial<Pick<CategoryRecord, 'name' | 'icon' | 'color' | 'type'>>;
    }): Promise<CategoryRecord> => {
      const record = this.records.find(
        (candidate) =>
          candidate.id === args.where.id &&
          candidate.userId === args.where.userId,
      );
      if (!record) throw new Error('Category not found');
      Object.assign(record, args.data, {
        updatedAt: new Date('2026-09-22T10:01:00.000Z'),
      });
      return { ...record };
    },
    delete: async (args: {
      where: { id: string; userId: string };
    }): Promise<CategoryRecord> => {
      const index = this.records.findIndex(
        (record) =>
          record.id === args.where.id && record.userId === args.where.userId,
      );
      if (index < 0) throw new Error('Category not found');
      return this.records.splice(index, 1)[0];
    },
  };

  readonly transaction = {
    count: async (args: { where: { categoryId: string } }): Promise<number> =>
      Number(this.usage.transaction.has(args.where.categoryId)),
  };
  readonly budget = {
    count: async (args: { where: { categoryId: string } }): Promise<number> =>
      Number(this.usage.budget.has(args.where.categoryId)),
  };
  readonly recurringTransaction = {
    count: async (args: { where: { categoryId: string } }): Promise<number> =>
      Number(this.usage.recurringTransaction.has(args.where.categoryId)),
  };

  seed(record: CategoryRecord): void {
    this.records.push({ ...record });
  }

  markUsed(kind: keyof CategoryPrismaFake['usage'], id: string): void {
    this.usage[kind].add(id);
  }

  getRecords(): CategoryRecord[] {
    return this.records.map((record) => ({ ...record }));
  }
}

const firstUser = createTestUser('first');
const secondUser = createTestUser('second');
const categoryId = '31111111-1111-4111-8111-111111111111';
const secondCategoryId = '32222222-2222-4222-8222-222222222222';
const categoryInput = {
  name: 'Groceries',
  icon: 'shopping_cart',
  color: '#2E7D32',
  type: 'EXPENSE',
};

describe('categories (e2e)', () => {
  let app: INestApplication;
  let prisma: CategoryPrismaFake;

  beforeEach(async () => {
    prisma = new CategoryPrismaFake();
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

  afterEach(async () => {
    await app.close();
  });

  function seedCategory(
    userId = firstUser.id,
    id = categoryId,
    name = 'Groceries',
  ): void {
    prisma.seed({
      id,
      userId,
      name,
      icon: 'shopping_cart',
      color: '#2E7D32',
      type: 'EXPENSE',
      createdAt: new Date('2026-09-22T10:00:00.000Z'),
      updatedAt: new Date('2026-09-22T10:00:00.000Z'),
    });
  }

  it('requires a valid session for category routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/categories').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send(categoryInput)
      .expect(401);
  });

  it('creates a category for the JWT owner and returns only public fields', async () => {
    const response = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send(categoryInput)
      .expect(201);

    expect(response.body).toMatchObject(categoryInput);
    expect(Object.keys(response.body).sort()).toEqual([
      'color',
      'createdAt',
      'icon',
      'id',
      'name',
      'type',
      'updatedAt',
    ]);
    expect(prisma.getRecords()[0].userId).toBe(firstUser.id);
  });

  it('lists only the owner categories with case-insensitive search and pagination', async () => {
    seedCategory();
    seedCategory(firstUser.id, secondCategoryId, 'grocerY delivery');
    seedCategory(
      secondUser.id,
      '33333333-3333-4333-8333-333333333333',
      'Grocery secret',
    );
    const response = await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/categories?search=GROC&page=2&pageSize=1',
      ),
      firstUser,
    ).expect(200);

    expect(response.body).toMatchObject({
      items: [{ name: 'grocerY delivery' }],
      meta: { page: 2, pageSize: 1, total: 2, totalPages: 2 },
    });
  });

  it('reads and updates an owned category', async () => {
    seedCategory();
    const read = await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/categories/${categoryId}`),
      firstUser,
    ).expect(200);
    expect(read.body).toMatchObject({ name: 'Groceries' });

    const updated = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/categories/${categoryId}`),
      firstUser,
    )
      .send({ name: '  Food  ', color: '#abcdef' })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'Food', color: '#ABCDEF' });
    expect(prisma.getRecords()[0]).toMatchObject({
      name: 'Food',
      color: '#ABCDEF',
    });
  });

  it('deletes an unused owned category', async () => {
    seedCategory();
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/categories/${categoryId}`),
      firstUser,
    ).expect(204);
    expect(prisma.getRecords()).toEqual([]);
  });

  it('rejects duplicate names ignoring case within one user', async () => {
    seedCategory();
    const duplicate = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send({ ...categoryInput, name: '  groceries  ' })
      .expect(409);
    expect(duplicate.body).toMatchObject({ code: 'CATEGORY_NAME_EXISTS' });
    expect(prisma.getRecords()).toHaveLength(1);
  });

  it('rejects duplicate names on update without changing the category', async () => {
    seedCategory();
    seedCategory(firstUser.id, secondCategoryId, 'Transport');
    const duplicate = await authenticateRequest(
      request(app.getHttpServer()).patch(
        `/api/v1/categories/${secondCategoryId}`,
      ),
      firstUser,
    )
      .send({ name: 'gRoCeRiEs' })
      .expect(409);
    expect(duplicate.body).toMatchObject({ code: 'CATEGORY_NAME_EXISTS' });
    expect(prisma.getRecords()[1].name).toBe('Transport');
  });

  it('rejects invalid fields, pagination and client-supplied ownership', async () => {
    const invalid = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send({
        ...categoryInput,
        icon: '🚀',
        color: 'red',
        type: 'OTHER',
        userId: secondUser.id,
      })
      .expect(400);
    expect(invalid.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    await authenticateRequest(
      request(app.getHttpServer()).get(
        '/api/v1/categories?page=0&pageSize=101',
      ),
      firstUser,
    ).expect(400);
    expect(prisma.getRecords()).toEqual([]);
  });

  it('rejects an invalid color on create and update without changing stored data', async () => {
    seedCategory();
    const create = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send({ ...categoryInput, name: 'Transport', color: '#12GG00' })
      .expect(400);
    expect(create.body).toMatchObject({ code: 'VALIDATION_ERROR' });

    const update = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/categories/${categoryId}`),
      firstUser,
    )
      .send({ color: '#12345' })
      .expect(400);
    expect(update.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(prisma.getRecords()).toHaveLength(1);
    expect(prisma.getRecords()[0]).toMatchObject({
      name: 'Groceries',
      color: '#2E7D32',
    });
  });

  it('requires all create fields and rejects an empty update', async () => {
    const missing = await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send({ name: 'Incomplete' })
      .expect(400);
    expect(missing.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    seedCategory();
    const empty = await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/categories/${categoryId}`),
      firstUser,
    )
      .send({})
      .expect(400);
    expect(empty.body).toMatchObject({ code: 'EMPTY_UPDATE' });
  });

  it('allows the same name for different users', async () => {
    seedCategory(secondUser.id);
    await authenticateRequest(
      request(app.getHttpServer()).post('/api/v1/categories'),
      firstUser,
    )
      .send(categoryInput)
      .expect(201);
    expect(prisma.getRecords()).toHaveLength(2);
  });

  it('returns 404 for another user category on read, update and delete', async () => {
    seedCategory(secondUser.id);
    await authenticateRequest(
      request(app.getHttpServer()).get(`/api/v1/categories/${categoryId}`),
      firstUser,
    ).expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).patch(`/api/v1/categories/${categoryId}`),
      firstUser,
    )
      .send({ name: 'No access' })
      .expect(404);
    await authenticateRequest(
      request(app.getHttpServer()).delete(`/api/v1/categories/${categoryId}`),
      firstUser,
    ).expect(404);
    expect(prisma.getRecords()[0].name).toBe('Groceries');
  });

  it.each(['transaction', 'budget', 'recurringTransaction'] as const)(
    'rejects deletion when a %s uses the category',
    async (kind) => {
      seedCategory();
      prisma.markUsed(kind, categoryId);
      const response = await authenticateRequest(
        request(app.getHttpServer()).delete(`/api/v1/categories/${categoryId}`),
        firstUser,
      ).expect(409);
      expect(response.body).toMatchObject({ code: 'CATEGORY_IN_USE' });
      expect(prisma.getRecords()).toHaveLength(1);
    },
  );

  it('documents protected CRUD, 409 errors and category examples in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths).toMatchObject({
      '/api/v1/categories': {
        get: {
          security: [{ cookieAuth: [] }],
          responses: { 200: {}, 401: {} },
        },
        post: {
          security: [{ cookieAuth: [] }],
          responses: { 201: {}, 400: {}, 409: {} },
        },
      },
      '/api/v1/categories/{id}': {
        get: { responses: { 200: {}, 404: {} } },
        patch: { responses: { 200: {}, 400: {}, 404: {}, 409: {} } },
        delete: { responses: { 204: {}, 404: {}, 409: {} } },
      },
    });
    expect(
      response.body.components.schemas.CreateCategoryDto.properties.color
        .example,
    ).toBe('#2E7D32');
  });
});
