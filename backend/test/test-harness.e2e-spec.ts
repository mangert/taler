import { Controller, Get, Headers } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DatabaseHealthIndicator } from '../src/health/database-health.indicator.js';
import { authenticateRequest } from './support/authenticate-request.js';
import { createTestApplication } from './support/create-test-application.js';
import { createTwoUserFixtures } from './support/factories.js';
import {
  TestRecordsController,
  TestRecordStore,
  TestJwtCookieGuard,
} from './support/test-records.js';

@Controller('test-harness-probe')
class TestHarnessProbeController {
  @Get()
  probe(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('auth-cookie')
  authCookie(@Headers('cookie') cookieHeader: string | undefined): {
    cookieHeader: string | null;
  } {
    return { cookieHeader: cookieHeader ?? null };
  }
}

describe('test harness (e2e)', () => {
  it('creates isolated data owned by two different users', () => {
    const [firstFixture, secondFixture] = createTwoUserFixtures();

    expect(firstFixture.user.id).not.toBe(secondFixture.user.id);
    expect(firstFixture.user.email).not.toBe(secondFixture.user.email);
    expect(firstFixture.category.userId).toBe(firstFixture.user.id);
    expect(firstFixture.transaction).toMatchObject({
      userId: firstFixture.user.id,
      categoryId: firstFixture.category.id,
    });
    expect(secondFixture.category.userId).toBe(secondFixture.user.id);
    expect(secondFixture.transaction).toMatchObject({
      userId: secondFixture.user.id,
      categoryId: secondFixture.category.id,
    });
  });

  it('starts a configured Nest application against the dedicated test database', async () => {
    const databaseUrl = new URL(process.env.DATABASE_URL ?? '');

    expect(databaseUrl.pathname).toBe('/taler_test');

    const app = await createTestApplication({
      controllers: [TestHarnessProbeController],
      configureModule: (moduleBuilder) =>
        moduleBuilder.overrideProvider(DatabaseHealthIndicator).useValue({
          check: async (): Promise<void> => undefined,
        }),
      enableSwagger: false,
    });

    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-harness-probe')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('authenticates a Supertest request with a signed JWT cookie', async () => {
    const [firstFixture] = createTwoUserFixtures();
    const app = await createTestApplication({
      controllers: [TestHarnessProbeController],
      configureModule: (moduleBuilder) =>
        moduleBuilder.overrideProvider(DatabaseHealthIndicator).useValue({
          check: async (): Promise<void> => undefined,
        }),
    });

    try {
      const response = await authenticateRequest(
        request(app.getHttpServer()).get(
          '/api/v1/test-harness-probe/auth-cookie',
        ),
        firstFixture.user,
      ).expect(200);
      const cookieHeader: unknown = response.body.cookieHeader;

      expect(typeof cookieHeader).toBe('string');

      if (typeof cookieHeader !== 'string') {
        throw new Error('Expected the auth cookie header');
      }

      const token = cookieHeader.replace(/^access_token=/, '');
      const payload = new JwtService({
        secret: process.env.JWT_SECRET,
      }).verify<{ sub: string; email: string }>(token);

      expect(payload).toMatchObject({
        sub: firstFixture.user.id,
        email: firstFixture.user.email,
      });
    } finally {
      await app.close();
    }
  });

  it('asserts both the response body and the create side effect', async () => {
    const [firstFixture] = createTwoUserFixtures();
    const app = await createTestApplication({
      controllers: [TestRecordsController],
      providers: [TestRecordStore, TestJwtCookieGuard],
      configureModule: (moduleBuilder) =>
        moduleBuilder.overrideProvider(DatabaseHealthIndicator).useValue({
          check: async (): Promise<void> => undefined,
        }),
    });
    const recordStore = app.get(TestRecordStore);

    try {
      const response = await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/test-records'),
        firstFixture.user,
      )
        .send({ name: 'Created through HTTP' })
        .expect(201);

      expect(response.body).toEqual({
        id: '00000000-0000-4000-8000-000000000001',
        userId: firstFixture.user.id,
        name: 'Created through HTTP',
      });
      expect(recordStore.getAll()).toEqual([response.body]);
    } finally {
      await app.close();
    }
  });

  it('returns the shared error shape for 400, 401, and ownership-safe 404 responses', async () => {
    const [firstFixture, secondFixture] = createTwoUserFixtures();
    const app = await createTestApplication({
      controllers: [TestRecordsController],
      providers: [TestRecordStore, TestJwtCookieGuard],
      configureModule: (moduleBuilder) =>
        moduleBuilder.overrideProvider(DatabaseHealthIndicator).useValue({
          check: async (): Promise<void> => undefined,
        }),
    });
    const recordStore = app.get(TestRecordStore);

    try {
      const unauthorizedResponse = await request(app.getHttpServer())
        .post('/api/v1/test-records')
        .send({ name: 'No cookie' })
        .expect(401);

      expect(unauthorizedResponse.body).toEqual({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: [],
      });

      const invalidResponse = await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/test-records'),
        firstFixture.user,
      )
        .send({ name: 'Forged owner', userId: secondFixture.user.id })
        .expect(400);

      expect(invalidResponse.body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: ['property userId should not exist'],
      });
      expect(recordStore.getAll()).toEqual([]);

      const createdResponse = await authenticateRequest(
        request(app.getHttpServer()).post('/api/v1/test-records'),
        firstFixture.user,
      )
        .send({ name: 'Private record' })
        .expect(201);

      const notFoundResponse = await authenticateRequest(
        request(app.getHttpServer()).get(
          `/api/v1/test-records/${createdResponse.body.id as string}`,
        ),
        secondFixture.user,
      ).expect(404);

      expect(notFoundResponse.body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Test record not found',
        details: [],
      });
    } finally {
      await app.close();
    }
  });
});
