import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import type { Category } from '../../shared/api/categories';
import type { TransactionListParams } from '../../shared/api/transactions';

export type TransactionFilterKey = Exclude<
  keyof TransactionListParams,
  'page' | 'pageSize'
>;

interface TransactionsFilterBarProps {
  filters: TransactionListParams;
  categories: Category[];
  onChange(key: TransactionFilterKey, value: string): void;
  onReset(): void;
}

export function TransactionsFilterBar({
  filters,
  categories,
  onChange,
  onReset,
}: TransactionsFilterBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeFilters: {
    key: TransactionFilterKey;
    label: string;
    value: string;
  }[] = [
    { key: 'search', label: 'Поиск', value: filters.search },
    { key: 'dateFrom', label: 'Дата с', value: filters.dateFrom },
    { key: 'dateTo', label: 'Дата по', value: filters.dateTo },
    {
      key: 'categoryId',
      label: 'Категория',
      value:
        categories.find((category) => category.id === filters.categoryId)
          ?.name ?? filters.categoryId,
    },
    { key: 'minAmount', label: 'Сумма от', value: filters.minAmount },
    { key: 'maxAmount', label: 'Сумма до', value: filters.maxAmount },
    {
      key: 'type',
      label: 'Тип',
      value:
        filters.type === 'EXPENSE'
          ? 'Расход'
          : filters.type === 'INCOME'
            ? 'Доход'
            : '',
    },
  ];
  const advancedFilters = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField
        label="Поиск по описанию"
        value={filters.search}
        onChange={(event) => onChange('search', event.target.value)}
        fullWidth
      />
      <TextField
        select
        label="Тип"
        value={filters.type}
        onChange={(event) => onChange('type', event.target.value)}
        sx={{ minWidth: { md: 150 } }}
        fullWidth
      >
        <MenuItem value="">Все типы</MenuItem>
        <MenuItem value="EXPENSE">Расход</MenuItem>
        <MenuItem value="INCOME">Доход</MenuItem>
      </TextField>
      <TextField
        label="Сумма от"
        value={filters.minAmount}
        onChange={(event) => onChange('minAmount', event.target.value)}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        fullWidth
      />
      <TextField
        label="Сумма до"
        value={filters.maxAmount}
        onChange={(event) => onChange('maxAmount', event.target.value)}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        fullWidth
      />
    </Stack>
  );

  return (
    <Stack spacing={2} aria-label="Фильтры транзакций">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Категория"
          value={filters.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
          fullWidth
        >
          <MenuItem value="">Все категории</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
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
      {isMobile ? (
        <>
          <Button
            startIcon={<TuneIcon />}
            onClick={() => setDrawerOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Дополнительные фильтры
          </Button>
          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: 'min(100vw, 360px)', p: 2 } }}
          >
            <Box role="dialog" aria-labelledby="transaction-filters-title">
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  id="transaction-filters-title"
                  component="h2"
                  variant="h6"
                >
                  Дополнительные фильтры
                </Typography>
                <IconButton
                  aria-label="Закрыть фильтры"
                  onClick={() => setDrawerOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              {advancedFilters}
            </Box>
          </Drawer>
        </>
      ) : (
        advancedFilters
      )}
      <Button onClick={onReset} sx={{ alignSelf: 'flex-start' }}>
        Сбросить фильтры
      </Button>
      {activeFilters.some((filter) => filter.value) ? (
        <Stack
          direction="row"
          sx={{ flexWrap: 'wrap', gap: 1 }}
          aria-label="Активные фильтры"
        >
          {activeFilters
            .filter((filter) => filter.value)
            .map((filter) => {
              const label = `${filter.label}: ${filter.value}`;
              return (
                <Chip
                  key={filter.key}
                  label={label}
                  variant="outlined"
                  aria-label={`Убрать фильтр ${label}`}
                  onClick={() => onChange(filter.key, '')}
                  onDelete={() => onChange(filter.key, '')}
                />
              );
            })}
        </Stack>
      ) : null}
    </Stack>
  );
}
