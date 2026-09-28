import {
  Alert,
  Box,
  Button,
  Container,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import {
  TransactionsFilterBar,
  type TransactionFilterKey,
} from '../features/transactions/TransactionsFilterBar';
import { TransactionsTable } from '../features/transactions/TransactionsTable';
import { TransactionCardList } from '../features/transactions/TransactionCardList';
import { PaginationControls } from '../features/transactions/PaginationControls';
import { TransactionFormDialog } from '../features/transactions/TransactionFormDialog';
import { DeleteTransactionDialog } from '../features/transactions/DeleteTransactionDialog';
import type { TransactionFormValues } from '../features/transactions/transaction-schema';
import type {
  Transaction,
  UpdateTransactionInput,
} from '../shared/api/transactions';
import { transactionKeys } from '../features/transactions/transaction-keys';
import { categoriesApi } from '../shared/api/categories';
import {
  transactionsApi,
  type TransactionListParams,
} from '../shared/api/transactions';

const pageSize = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readParams(searchParams: URLSearchParams): TransactionListParams {
  const type = searchParams.get('type');
  return {
    search: searchParams.get('search') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
    minAmount: searchParams.get('minAmount') ?? '',
    maxAmount: searchParams.get('maxAmount') ?? '',
    type: type === 'INCOME' || type === 'EXPENSE' ? type : '',
    page: parsePage(searchParams.get('page')),
    pageSize,
  };
}

export function TransactionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const hasFilters = Boolean(
    params.search ||
    params.dateFrom ||
    params.dateTo ||
    params.categoryId ||
    params.minAmount ||
    params.maxAmount ||
    params.type,
  );
  const userId = user?.id ?? '';
  const transactionsQuery = useQuery({
    queryKey: transactionKeys.list(userId, params),
    queryFn: () => transactionsApi.list(params),
    enabled: Boolean(userId),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', userId, 'transactions-options'],
    queryFn: categoriesApi.listAll,
    enabled: Boolean(userId),
  });
  const categoryNames = new Map(
    categoriesQuery.data?.map((category) => [category.id, category.name]) ?? [],
  );
  const createTransaction = useMutation({ mutationFn: transactionsApi.create });
  const updateTransaction = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: UpdateTransactionInput;
    }) => transactionsApi.update(id, values),
  });
  const deleteTransaction = useMutation({ mutationFn: transactionsApi.remove });
  const saveTransaction = async (
    values: TransactionFormValues,
  ): Promise<void> => {
    const input = { ...values, description: values.description.trim() || null };
    if (editingTransaction) {
      await updateTransaction.mutateAsync({
        id: editingTransaction.id,
        values: input,
      });
    } else {
      await createTransaction.mutateAsync(input);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
    ]);
    setFormOpen(false);
    setEditingTransaction(null);
  };
  const openEdit = (transaction: Transaction): void => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };
  const confirmDelete = async (transaction: Transaction): Promise<void> => {
    await deleteTransaction.mutateAsync(transaction.id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
    ]);
    setDeletingTransaction(null);
  };

  const updateFilter = (key: TransactionFilterKey, value: string): void => {
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between' }}
        >
          <Typography component="h1" variant="h3">
            Транзакции
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setEditingTransaction(null);
              setFormOpen(true);
            }}
          >
            Добавить транзакцию
          </Button>
        </Stack>
        {categoriesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void categoriesQuery.refetch()}>
                Повторить
              </Button>
            }
          >
            Не удалось загрузить категории.
          </Alert>
        ) : null}
        <TransactionsFilterBar
          filters={params}
          categories={categoriesQuery.data ?? []}
          onChange={updateFilter}
          onReset={() =>
            setSearchParams(new URLSearchParams(), { replace: true })
          }
        />
        {transactionsQuery.isPending ? (
          <Stack role="status" aria-label="Загрузка транзакций" spacing={2}>
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
          </Stack>
        ) : transactionsQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void transactionsQuery.refetch()}>
                Повторить
              </Button>
            }
          >
            Не удалось загрузить транзакции.
          </Alert>
        ) : transactionsQuery.data.items.length === 0 ? (
          <Alert severity="info">
            {hasFilters
              ? 'По вашим фильтрам транзакции не найдены.'
              : 'У вас пока нет транзакций.'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TransactionsTable
                transactions={transactionsQuery.data.items}
                categoryNames={categoryNames}
                onEdit={openEdit}
                onDelete={setDeletingTransaction}
              />
            </Box>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <TransactionCardList
                transactions={transactionsQuery.data.items}
                categoryNames={categoryNames}
                onEdit={openEdit}
                onDelete={setDeletingTransaction}
              />
            </Box>
            <PaginationControls
              page={params.page}
              totalPages={transactionsQuery.data.meta.totalPages}
              total={transactionsQuery.data.meta.total}
              onChange={updatePage}
            />
          </Stack>
        )}
        <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
          Вернуться на главную
        </Button>
        {formOpen ? (
          <TransactionFormDialog
            transaction={editingTransaction}
            categories={categoriesQuery.data ?? []}
            baseCurrency={user?.baseCurrency ?? ''}
            onClose={() => setFormOpen(false)}
            onSave={saveTransaction}
          />
        ) : null}
        {deletingTransaction ? (
          <DeleteTransactionDialog
            transaction={deletingTransaction}
            onClose={() => setDeletingTransaction(null)}
            onConfirm={confirmDelete}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
