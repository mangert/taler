import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/http';

export function applyServerFieldErrors<TValues extends FieldValues>(
  error: unknown,
  fields: readonly FieldPath<TValues>[],
  setError: UseFormSetError<TValues>,
): boolean {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') {
    return false;
  }

  let hasFieldError = false;

  for (const field of fields) {
    const message = error.details.find(
      (detail): detail is string =>
        typeof detail === 'string' &&
        (detail === field || detail.startsWith(`${field} `)),
    );

    if (message) {
      setError(
        field,
        { type: 'server', message },
        { shouldFocus: !hasFieldError },
      );
      hasFieldError = true;
    }
  }

  return hasFieldError;
}
