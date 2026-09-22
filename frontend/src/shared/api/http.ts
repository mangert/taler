import type { components } from './schema';

export type ApiErrorResponse = components['schemas']['ApiErrorResponseDto'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    typeof value.statusCode === 'number' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    Array.isArray(value.details)
  );
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = 'ApiError';
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.details = response.details;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json();

  if (!response.ok) {
    if (isApiErrorResponse(body)) {
      throw new ApiError(body);
    }

    throw new ApiError({
      statusCode: response.status,
      code: 'UNEXPECTED_RESPONSE',
      message: 'Сервер вернул неожиданный ответ',
      details: [],
    });
  }

  return body as T;
}
