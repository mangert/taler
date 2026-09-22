import type { INestApplication } from '@nestjs/common';
import { verify } from 'argon2';
import request from 'supertest';
import { DatabaseHealthIndicator } from '../src/health/database-health.indicator.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApplication } from './support/create-test-application.js';
import { FakePrismaService } from './support/fake-prisma-service.js';

const publicUserFields = [
  'baseCurrency',
  'createdAt',
  'displayName',
  'email',
  'id',
  'timeZone',
  'updatedAt',
];

function expectPublicUserBody(value: unknown): void {
  expect(typeof value).toBe('object');
  expect(value).not.toBeNull();

  if (typeof value !== 'object' || value === null) {
    throw new Error('Expected a public user response object');
  }

  expect(Object.keys(value).sort()).toEqual(publicUserFields);
  expect(value).not.toHaveProperty('passwordHash');
  expect(value).not.toHaveProperty('accessToken');
  expect(value).not.toHaveProperty('sub');
  expect(value).not.toHaveProperty('iat');
  expect(value).not.toHaveProperty('exp');
}

describe('authentication and profile (e2e)', () => {
  let app: INestApplication;
  let fakePrisma: FakePrismaService;

  beforeEach(async () => {
    fakePrisma = new FakePrismaService();
    app = await createTestApplication({
      enableSwagger: true,
      configureModule: (moduleBuilder) =>
        moduleBuilder
          .overrideProvider(DatabaseHealthIndicator)
          .useValue({
            check: async (): Promise<void> => undefined,
          })
          .overrideProvider(PrismaService)
          .useValue(fakePrisma),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers a user and returns the public profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: '  New.User@Example.Test  ',
        password: 'Strong-password-1!',
        displayName: 'New User',
        baseCurrency: 'EUR',
        timeZone: 'Europe/Amsterdam',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'new.user@example.test',
      displayName: 'New User',
      baseCurrency: 'EUR',
      timeZone: 'Europe/Amsterdam',
    });
    expectPublicUserBody(response.body as unknown);
    const setCookieHeader: unknown = response.headers['set-cookie'];

    expect(setCookieHeader).toEqual([
      expect.stringMatching(
        /^access_token=.+; Max-Age=900; Path=\/; Expires=.+; HttpOnly; SameSite=Strict$/,
      ),
    ]);
    expect(JSON.stringify(setCookieHeader)).not.toContain('Secure');
    expect(fakePrisma.getUsers()).toHaveLength(1);
    const [storedUser] = fakePrisma.getUsers();

    expect(storedUser.email).toBe('new.user@example.test');
    expect(storedUser.passwordHash).not.toBe('Strong-password-1!');
    await expect(
      verify(storedUser.passwordHash, 'Strong-password-1!'),
    ).resolves.toBe(true);
  });

  it('rejects a duplicate normalized email', async () => {
    const registration = {
      email: 'Duplicate.User@Example.Test',
      password: 'Strong-password-1!',
      displayName: 'First User',
      baseCurrency: 'EUR',
      timeZone: 'Europe/Amsterdam',
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        ...registration,
        email: '  duplicate.user@example.test  ',
        displayName: 'Second User',
      })
      .expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists',
      details: [],
    });
    expect(fakePrisma.getUsers()).toHaveLength(1);
  });

  it('rejects invalid registration fields without creating a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        displayName: '',
        baseCurrency: 'EURO',
        timeZone: 'Not/A_Time_Zone',
        userId: 'forged-owner',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: expect.arrayContaining([
        'property userId should not exist',
        'email must be an email',
        'password must be longer than or equal to 12 characters',
        'displayName must be longer than or equal to 1 characters',
        'baseCurrency must match /^[A-Z]{3}$/ regular expression',
        'timeZone must be a valid IANA time-zone',
      ]),
    });
    expect(fakePrisma.getUsers()).toEqual([]);
  });

  it('logs in, reads the current session, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());
    const registration = {
      email: 'session.user@example.test',
      password: 'Strong-password-1!',
      displayName: 'Session User',
      baseCurrency: 'EUR',
      timeZone: 'Europe/Amsterdam',
    };

    await agent.post('/api/v1/auth/register').send(registration).expect(201);
    const logoutResponse = await agent.post('/api/v1/auth/logout').expect(204);
    const clearedCookieHeader: unknown = logoutResponse.headers['set-cookie'];

    expect(clearedCookieHeader).toEqual([
      expect.stringMatching(
        /^access_token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict$/,
      ),
    ]);
    await agent.get('/api/v1/auth/me').expect(401);

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({
        email: '  SESSION.USER@EXAMPLE.TEST ',
        password: registration.password,
      })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      email: registration.email,
      displayName: registration.displayName,
    });

    const meResponse = await agent.get('/api/v1/auth/me').expect(200);

    expect(meResponse.body).toEqual(loginResponse.body);
    expectPublicUserBody(loginResponse.body as unknown);
    expectPublicUserBody(meResponse.body as unknown);
  });

  it('marks the session cookie as Secure in production', async () => {
    await app.close();
    const previousNodeEnvironment = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';

    try {
      app = await createTestApplication({
        enableSwagger: true,
        configureModule: (moduleBuilder) =>
          moduleBuilder
            .overrideProvider(DatabaseHealthIndicator)
            .useValue({
              check: async (): Promise<void> => undefined,
            })
            .overrideProvider(PrismaService)
            .useValue(fakePrisma),
      });
    } finally {
      if (previousNodeEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnvironment;
      }
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'secure.cookie@example.test',
        password: 'Strong-password-1!',
        displayName: 'Secure Cookie',
        baseCurrency: 'EUR',
        timeZone: 'Europe/Amsterdam',
      })
      .expect(201);
    const setCookieHeader: unknown = response.headers['set-cookie'];

    expect(setCookieHeader).toEqual([
      expect.stringMatching(/; HttpOnly; Secure; SameSite=Strict$/),
    ]);
  });

  it('rejects missing and invalid JWT cookies with the same safe 401', async () => {
    const expectedError = {
      statusCode: 401,
      code: 'INVALID_SESSION',
      message: 'Authentication is required',
      details: [],
    };
    const missingResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
    const invalidResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', 'access_token=not-a-valid-jwt')
      .expect(401);

    expect(missingResponse.body).toEqual(expectedError);
    expect(invalidResponse.body).toEqual(expectedError);
  });

  it('updates the current user profile from the verified JWT owner', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: 'profile.user@example.test',
        password: 'Strong-password-1!',
        displayName: 'Original Name',
        baseCurrency: 'EUR',
        timeZone: 'Europe/Amsterdam',
      })
      .expect(201);

    const response = await agent
      .patch('/api/v1/users/me')
      .send({
        displayName: '  Updated Name  ',
        baseCurrency: 'usd',
        timeZone: 'America/New_York',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'profile.user@example.test',
      displayName: 'Updated Name',
      baseCurrency: 'USD',
      timeZone: 'America/New_York',
    });
    expectPublicUserBody(response.body as unknown);
    expect(fakePrisma.getUsers()[0]).toMatchObject({
      displayName: 'Updated Name',
      baseCurrency: 'USD',
      timeZone: 'America/New_York',
    });
  });

  it('locks base currency after the first transaction without a partial update', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        email: 'locked.currency@example.test',
        password: 'Strong-password-1!',
        displayName: 'Original Name',
        baseCurrency: 'EUR',
        timeZone: 'Europe/Amsterdam',
      })
      .expect(201);

    const [storedUser] = fakePrisma.getUsers();

    fakePrisma.addTransaction(storedUser.id);

    const response = await agent
      .patch('/api/v1/users/me')
      .send({
        displayName: 'Must Not Change',
        baseCurrency: 'USD',
      })
      .expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      code: 'BASE_CURRENCY_LOCKED',
      message: 'Base currency cannot be changed after the first transaction',
      details: [],
    });
    expect(fakePrisma.getUsers()[0]).toMatchObject({
      displayName: 'Original Name',
      baseCurrency: 'EUR',
    });
  });

  it('uses the same safe error for a wrong password and an unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'login.user@example.test',
        password: 'Strong-password-1!',
        displayName: 'Login User',
        baseCurrency: 'EUR',
        timeZone: 'Europe/Amsterdam',
      })
      .expect(201);

    const expectedError = {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      details: [],
    };
    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'login.user@example.test',
        password: 'Wrong-password-1!',
      })
      .expect(401);
    const unknownEmailResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'unknown.user@example.test',
        password: 'Wrong-password-1!',
      })
      .expect(401);

    expect(wrongPasswordResponse.body).toEqual(expectedError);
    expect(unknownEmailResponse.body).toEqual(expectedError);
  });

  it('documents auth and profile contracts without internal user fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body.paths).toMatchObject({
      '/api/v1/auth/register': { post: { responses: { 201: {}, 409: {} } } },
      '/api/v1/auth/login': { post: { responses: { 200: {}, 401: {} } } },
      '/api/v1/auth/logout': {
        post: {
          security: [{ cookieAuth: [] }],
          responses: { 204: {}, 401: {} },
        },
      },
      '/api/v1/auth/me': {
        get: {
          security: [{ cookieAuth: [] }],
          responses: { 200: {}, 401: {} },
        },
      },
      '/api/v1/users/me': {
        patch: {
          security: [{ cookieAuth: [] }],
          responses: { 200: {}, 400: {}, 401: {}, 409: {} },
        },
      },
    });
    expect(response.body.components.schemas.UserResponseDto.properties).toEqual(
      {
        id: expect.any(Object),
        email: expect.any(Object),
        displayName: expect.any(Object),
        baseCurrency: expect.any(Object),
        timeZone: expect.any(Object),
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      },
    );
  });
});
