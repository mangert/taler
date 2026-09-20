import { Logger, LoggerService } from '@nestjs/common';
import { RequestHandler } from 'express';

type RequestLogger = Pick<LoggerService, 'log'>;

export function createRequestLoggingMiddleware(
  logger: RequestLogger = new Logger('HTTP'),
): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationNanoseconds = process.hrtime.bigint() - startedAt;

      logger.log({
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Number(durationNanoseconds) / 1_000_000,
      });
    });

    next();
  };
}
