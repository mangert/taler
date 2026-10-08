import { Alert, Button, Stack, Typography } from '@mui/material';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { TransactionImportResult } from '../../shared/api/transaction-imports';
import { ApiError } from '../../shared/api/http';

interface RowError {
  row: number;
  field: string;
  message: string;
}

function isRowError(value: unknown): value is RowError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'row' in value &&
    typeof value.row === 'number' &&
    'field' in value &&
    typeof value.field === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

interface ImportResultProps {
  result: TransactionImportResult | null;
  error: unknown;
  onBack: () => void;
  onRestart: () => void;
}

export function ImportResult({
  result,
  error,
  onBack,
  onRestart,
}: ImportResultProps) {
  const errorsHeadingRef = useRef<HTMLHeadingElement>(null);
  const rowErrors =
    error instanceof ApiError ? error.details.filter(isRowError) : [];
  return (
    <Stack component="section" spacing={2} aria-label="Результат импорта">
      <Typography component="h2" variant="h5">
        Результат импорта
      </Typography>
      {result ? (
        <>
          <Alert severity="success">
            Импортировано транзакций: {result.importedCount}
          </Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={Link} to="/transactions" variant="contained">
              К транзакциям
            </Button>
            <Button onClick={onRestart}>Импортировать ещё</Button>
          </Stack>
        </>
      ) : (
        <>
          <Alert severity="error">
            {error instanceof ApiError
              ? error.message
              : 'Не удалось импортировать файл. Попробуйте ещё раз.'}
          </Alert>
          {rowErrors.length ? (
            <Stack
              component="section"
              spacing={1}
              aria-labelledby="row-errors-heading"
            >
              <Typography
                component="h3"
                variant="h6"
                id="row-errors-heading"
                ref={errorsHeadingRef}
                tabIndex={-1}
              >
                Ошибки по строкам
              </Typography>
              <Stack
                component="ol"
                spacing={1}
                aria-labelledby="row-errors-heading"
                sx={{ m: 0, pl: 3 }}
              >
                {rowErrors.map((item, index) => (
                  <Typography
                    component="li"
                    key={`${item.row}-${item.field}-${index}`}
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    Строка {item.row}, поле {item.field}: {item.message}
                  </Typography>
                ))}
              </Stack>
              <Button
                onClick={() => errorsHeadingRef.current?.focus()}
                sx={{ alignSelf: 'flex-start' }}
              >
                К началу ошибок
              </Button>
            </Stack>
          ) : null}
          <Button onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
            К сопоставлению
          </Button>
        </>
      )}
    </Stack>
  );
}
