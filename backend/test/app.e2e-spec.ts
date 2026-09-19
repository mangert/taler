import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureSwagger } from './../src/common/swagger/configure-swagger.js';
import { DatabaseHealthIndicator } from './../src/health/database-health.indicator.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureSwagger(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('reports that the process and database are healthy', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      checks: {
        process: 'up',
        database: 'up',
      },
      timestamp: expect.any(String),
    });
    expect(new Date(response.body.timestamp as string).toISOString()).toBe(
      response.body.timestamp,
    );
  });

  it('reports an unavailable database without exposing its error', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseHealthIndicator)
      .useValue({
        check: jest
          .fn<() => Promise<void>>()
          .mockRejectedValue(new Error('private SQL error')),
      })
      .compile();

    const unavailableApp = moduleFixture.createNestApplication();
    await unavailableApp.init();

    try {
      const response = await request(unavailableApp.getHttpServer())
        .get('/api/v1/health')
        .expect(503);

      expect(response.body).toEqual({
        status: 'error',
        checks: {
          process: 'up',
          database: 'down',
        },
        timestamp: expect.any(String),
      });
      expect(JSON.stringify(response.body)).not.toContain('private SQL error');
    } finally {
      await unavailableApp.close();
    }
  });

  it('exposes Swagger UI and an OpenAPI document', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body).toMatchObject({
      openapi: expect.stringMatching(/^3\./),
      info: {
        title: 'Taler API',
      },
      paths: {
        '/api/v1/health': expect.any(Object),
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
