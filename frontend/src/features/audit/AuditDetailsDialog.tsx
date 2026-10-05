import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link as MuiLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AuditEntry } from '../../shared/api/audit';
import { ApiError } from '../../shared/api/http';
import { transactionsApi } from '../../shared/api/transactions';
import {
  actionLabels,
  auditChanges,
  entityLabels,
  formatAuditTimestamp,
} from './audit-display';
import { auditKeys } from './audit-keys';

interface AuditDetailsDialogProps {
  entry: AuditEntry;
  userId: string;
  timeZone: string;
  onClose(): void;
}

export function AuditDetailsDialog({
  entry,
  userId,
  timeZone,
  onClose,
}: AuditDetailsDialogProps) {
  const canCheckTransaction =
    entry.entityType === 'TRANSACTION' && entry.action !== 'DELETE';
  const entityQuery = useQuery({
    queryKey: auditKeys.entity(userId, entry.entityId),
    queryFn: () => transactionsApi.get(entry.entityId),
    enabled: canCheckTransaction,
    retry: false,
  });
  const fields = auditChanges(entry);
  const changeLabel = {
    CREATE: 'Добавлено',
    UPDATE: 'Изменено',
    DELETE: 'Удалено',
  }[entry.action];
  const changeColor = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'error',
  } as const;

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="audit-details-title"
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id="audit-details-title">Детали изменения</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            {entityLabels[entry.entityType]} · {actionLabels[entry.action]} ·{' '}
            <Box component="time" dateTime={entry.createdAt}>
              {formatAuditTimestamp(entry.createdAt, timeZone)}
            </Box>
          </Typography>
          {canCheckTransaction && entityQuery.isPending ? (
            <Typography role="status">
              Проверяем доступность транзакции…
            </Typography>
          ) : canCheckTransaction && entityQuery.isSuccess ? (
            <MuiLink
              component={Link}
              to={`/transactions?transactionId=${encodeURIComponent(entry.entityId)}`}
            >
              Открыть транзакцию
            </MuiLink>
          ) : entry.entityType === 'TRANSACTION' &&
            (entry.action === 'DELETE' ||
              (entityQuery.error instanceof ApiError &&
                entityQuery.error.statusCode === 404)) ? (
            <Typography color="text.secondary">
              Транзакция больше не доступна.
            </Typography>
          ) : canCheckTransaction && entityQuery.isError ? (
            <Alert
              severity="warning"
              action={
                <Button onClick={() => void entityQuery.refetch()}>
                  Повторить проверку
                </Button>
              }
            >
              Не удалось проверить доступность транзакции.
            </Alert>
          ) : null}
          {entry.entityType === 'BUDGET' ? (
            <Typography color="text.secondary">
              Переход к бюджету пока недоступен.
            </Typography>
          ) : null}
          {fields.length === 0 ? (
            <Typography>Для этой записи нет полей для сравнения.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table
                size="small"
                aria-label="Сравнение изменений"
                sx={{ minWidth: 440 }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Поле</TableCell>
                    <TableCell>До</TableCell>
                    <TableCell>После</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow
                      key={field.key}
                      sx={{
                        bgcolor: field.changed ? 'action.hover' : undefined,
                      }}
                    >
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          borderLeft: field.changed ? '4px solid' : undefined,
                          borderColor: field.changed
                            ? 'primary.main'
                            : undefined,
                        }}
                      >
                        {field.label}
                        {field.changed ? (
                          <Chip
                            component="span"
                            size="small"
                            color={changeColor[entry.action]}
                            label={changeLabel}
                            sx={{ ml: 1 }}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ overflowWrap: 'anywhere' }}>
                        {field.before}
                      </TableCell>
                      <TableCell sx={{ overflowWrap: 'anywhere' }}>
                        {field.after}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
