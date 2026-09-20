import { Test, TestingModule } from '@nestjs/testing';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApplication } from './../src/common/bootstrap/configure-application.js';
import { configureSwagger } from './../src/common/swagger/configure-swagger.js';
import { DatabaseHealthIndicator } from './../src/health/database-health.indicator.js';

class ValidationProbeDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}

@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  validate(@Body() body: ValidationProbeDto): ValidationProbeDto {
    return body;
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException('Probe not found');
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('private implementation detail');
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationProbeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    configureSwagger(app);
    await app.init();
  });

  it('serves application routes only below the global API prefix', async () => {
    await request(app.getHttpServer()).get('/').expect(404);
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!')
      .expect('x-content-type-options', 'nosniff');
  });

  it('allows CORS credentials only for the configured frontend origin', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .expect('access-control-allow-origin', 'http://localhost:5173')
      .expect('access-control-allow-credentials', 'true')
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200);

    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('transforms and validates request DTOs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'monthly', count: '2' })
      .expect(201);

    expect(response.body).toEqual({ name: 'monthly', count: 2 });
  });

  it('rejects request fields that are absent from the DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'monthly', count: 2, userId: 'untrusted-owner' })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: ['property userId should not exist'],
    });
  });

  it('uses one safe error contract for expected and unexpected errors', async () => {
    const missingResponse = await request(app.getHttpServer())
      .get('/api/v1/validation-probe/missing')
      .expect(404);

    expect(missingResponse.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Probe not found',
      details: [],
    });

    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    try {
      const unexpectedResponse = await request(app.getHttpServer())
        .get('/api/v1/validation-probe/unexpected')
        .expect(500);

      expect(unexpectedResponse.body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: [],
      });
      expect(JSON.stringify(unexpectedResponse.body)).not.toContain(
        'private implementation detail',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Unhandled request error',
        expect.any(String),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('logs only allowlisted request metadata', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    try {
      await request(app.getHttpServer())
        .post('/api/v1/validation-probe?token=query-secret')
        .set('Cookie', 'access_token=cookie-secret')
        .set('Authorization', 'Bearer jwt-secret')
        .send({
          name: 'passwordHash=body-secret,csv=private-content',
          count: 2,
        })
        .expect(201);

      expect(logSpy).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/v1/validation-probe',
        statusCode: 201,
        durationMs: expect.any(Number),
      });

      const serializedLogs = JSON.stringify(logSpy.mock.calls);

      expect(serializedLogs).not.toContain('query-secret');
      expect(serializedLogs).not.toContain('cookie-secret');
      expect(serializedLogs).not.toContain('jwt-secret');
      expect(serializedLogs).not.toContain('passwordHash');
      expect(serializedLogs).not.toContain('private-content');
    } finally {
      logSpy.mockRestore();
    }
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
    configureApplication(unavailableApp);
    await unavailableApp.init();

    try {
      const response = await request(unavailableApp.getHttpServer())
        .get('/api/v1/health')
        .expect(503);

      expect(response.body).toEqual({
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database health check failed',
        details: [],
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
        '/api/v1/health': {
          get: {
            responses: {
              503: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ApiErrorResponseDto',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          ApiErrorResponseDto: {
            type: 'object',
            properties: {
              statusCode: expect.any(Object),
              code: expect.any(Object),
              message: expect.any(Object),
              details: expect.any(Object),
            },
          },
        },
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
