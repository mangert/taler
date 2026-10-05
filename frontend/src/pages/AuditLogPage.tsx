import {
  Alert,
  Box,
  Button,
  Container,
  Pagination,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import { AuditCardList } from '../features/audit/AuditCardList';
import { AuditDetailsDialog } from '../features/audit/AuditDetailsDialog';
import {
  AuditFilterBar,
  type AuditFilterKey,
} from '../features/audit/AuditFilterBar';
import { auditKeys } from '../features/audit/audit-keys';
import { AuditTable } from '../features/audit/AuditTable';
import {
  auditApi,
  type AuditEntry,
  type AuditListParams,
} from '../shared/api/audit';

const pageSize = 20;

function readParams(searchParams: URLSearchParams): AuditListParams {
  const entityType = searchParams.get('entityType');
  const action = searchParams.get('action');
  const rawPage = Number(searchParams.get('page'));
  return {
    entityType:
      entityType === 'TRANSACTION' || entityType === 'BUDGET' ? entityType : '',
    action:
      action === 'CREATE' || action === 'UPDATE' || action === 'DELETE'
        ? action
        : '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize,
  };
}

export function AuditLogPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const timeZone = user?.timeZone ?? 'UTC';
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const params = readParams(searchParams);
  const hasFilters = Boolean(
    params.entityType || params.action || params.dateFrom || params.dateTo,
  );
  const auditQuery = useQuery({
    queryKey: auditKeys.list(userId, params),
    queryFn: () => auditApi.list(params),
    enabled: Boolean(userId),
  });

  const updateFilter = (key: AuditFilterKey, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const updatePage = (page: number): void => {
    const next = new URLSearchParams(searchParams);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Typography component="h1" variant="h3">
          Журнал изменений
        </Typography>
        <AuditFilterBar
          filters={params}
          onChange={updateFilter}
          onReset={() =>
            setSearchParams(new URLSearchParams(), { replace: true })
          }
        />
        {auditQuery.isPending ? (
          <Stack role="status" aria-label="Загрузка журнала" spacing={2}>
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
          </Stack>
        ) : auditQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void auditQuery.refetch()}>
                Повторить
              </Button>
            }
          >
            Не удалось загрузить журнал изменений.
          </Alert>
        ) : auditQuery.data.items.length === 0 &&
          auditQuery.data.meta.total > 0 ? (
          <Alert
            severity="info"
            action={
              <Button onClick={() => updatePage(1)}>
                Вернуться на первую страницу
              </Button>
            }
          >
            На этой странице изменений больше нет.
          </Alert>
        ) : auditQuery.data.items.length === 0 ? (
          <Alert severity="info">
            {hasFilters
              ? 'По вашим фильтрам изменений не найдено.'
              : 'В журнале пока нет изменений.'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <AuditTable
                entries={auditQuery.data.items}
                timeZone={timeZone}
                onDetails={setSelectedEntry}
              />
            </Box>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <AuditCardList
                entries={auditQuery.data.items}
                timeZone={timeZone}
                onDetails={setSelectedEntry}
              />
            </Box>
            {auditQuery.data.meta.totalPages > 1 ? (
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  Всего изменений: {auditQuery.data.meta.total}
                </Typography>
                <Pagination
                  aria-label="Страницы журнала"
                  count={auditQuery.data.meta.totalPages}
                  page={params.page}
                  onChange={(_event, page) => updatePage(page)}
                />
              </Stack>
            ) : null}
          </Stack>
        )}
        <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
          Вернуться на главную
        </Button>
        {selectedEntry ? (
          <AuditDetailsDialog
            entry={selectedEntry}
            userId={userId}
            timeZone={timeZone}
            onClose={() => setSelectedEntry(null)}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
