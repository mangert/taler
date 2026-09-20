import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { ApiErrorResponseDto } from './dto/api-error-response.dto.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultErrorCode(statusCode: number): string {
  const name = HttpStatus[statusCode];

  return typeof name === 'string' ? name : 'HTTP_ERROR';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const body = isRecord(exceptionResponse) ? exceptionResponse : undefined;
    const validationDetails = Array.isArray(body?.message)
      ? body.message.filter(
          (detail): detail is string => typeof detail === 'string',
        )
      : [];
    const isValidationError =
      statusCode === HttpStatus.BAD_REQUEST && validationDetails.length > 0;
    const code =
      typeof body?.code === 'string'
        ? body.code
        : isValidationError
          ? 'VALIDATION_ERROR'
          : defaultErrorCode(statusCode);
    const message =
      typeof body?.message === 'string'
        ? body.message
        : typeof exceptionResponse === 'string'
          ? exceptionResponse
          : isValidationError
            ? 'Request validation failed'
            : isHttpException
              ? exception.message
              : 'Internal server error';
    const details = Array.isArray(body?.details)
      ? body.details
      : validationDetails;

    if (!isHttpException) {
      this.logger.error(
        'Unhandled request error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      details,
    } satisfies ApiErrorResponseDto);
  }
}
