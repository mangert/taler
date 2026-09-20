import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ApiExceptionFilter } from '../errors/api-exception.filter.js';
import { createRequestLoggingMiddleware } from '../logging/request-logging.middleware.js';

type CorsOriginCallback = (
  error: Error | null,
  origin?: boolean | string | RegExp | (string | RegExp)[],
) => void;

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  const frontendOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN');

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet());
  app.use(createRequestLoggingMiddleware());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: CorsOriginCallback,
    ) => {
      callback(
        null,
        requestOrigin === undefined || requestOrigin === frontendOrigin,
      );
    },
    credentials: true,
  });
}
