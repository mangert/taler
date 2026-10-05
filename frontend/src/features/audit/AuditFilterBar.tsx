import { Button, MenuItem, Stack, TextField } from '@mui/material';
import type { AuditListParams } from '../../shared/api/audit';

export type AuditFilterKey = 'entityType' | 'action' | 'dateFrom' | 'dateTo';

interface AuditFilterBarProps {
  filters: AuditListParams;
  onChange(key: AuditFilterKey, value: string): void;
  onReset(): void;
}

export function AuditFilterBar({
  filters,
  onChange,
  onReset,
}: AuditFilterBarProps) {
  return (
    <Stack spacing={2} aria-label="Фильтры журнала">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Сущность"
          value={filters.entityType}
          onChange={(event) => onChange('entityType', event.target.value)}
          fullWidth
        >
          <MenuItem value="">Все сущности</MenuItem>
          <MenuItem value="TRANSACTION">Транзакция</MenuItem>
          <MenuItem value="BUDGET">Бюджет</MenuItem>
        </TextField>
        <TextField
          select
          label="Действие"
          value={filters.action}
          onChange={(event) => onChange('action', event.target.value)}
          fullWidth
        >
          <MenuItem value="">Все действия</MenuItem>
          <MenuItem value="CREATE">Создание</MenuItem>
          <MenuItem value="UPDATE">Изменение</MenuItem>
          <MenuItem value="DELETE">Удаление</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Дата с"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => onChange('dateFrom', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          label="Дата по"
          type="date"
          value={filters.dateTo}
          onChange={(event) => onChange('dateTo', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      </Stack>
      <Button onClick={onReset} sx={{ alignSelf: 'flex-start' }}>
        Сбросить фильтры
      </Button>
    </Stack>
  );
}
