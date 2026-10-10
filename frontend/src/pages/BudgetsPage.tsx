import {
  Alert,
  Button,
  Container,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BudgetGrid } from '../features/budgets/BudgetGrid';
import { BudgetFormDialog } from '../features/budgets/BudgetFormDialog';
import { DeleteBudgetDialog } from '../features/budgets/DeleteBudgetDialog';
import { MonthSelector } from '../features/budgets/MonthSelector';
import { budgetKeys } from '../features/budgets/budget-keys';
import { selectedBudgetMonth } from '../features/budgets/budget-month';
import { invalidateBudgetDependents } from '../features/budgets/invalidate-budget-dependents';
import type { BudgetFormValues } from '../features/budgets/budget-schema';
import { useAuth } from '../features/auth/auth-context';
import { budgetsApi, type Budget } from '../shared/api/budgets';
import { categoriesApi } from '../shared/api/categories';
import { EmptyState, ErrorState, PageSkeleton } from '../shared/ui/PageStates';

const pageSize = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function BudgetsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = user?.id ?? '';
  const month = selectedBudgetMonth(
    searchParams.get('month'),
    user?.timeZone ?? 'UTC',
  );
  const page = parsePage(searchParams.get('page'));
  const params = { month, page, pageSize };
  const budgetsQuery = useQuery({
    queryKey: budgetKeys.list(userId, params),
    queryFn: () => budgetsApi.list(params),
    enabled: Boolean(userId),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', userId, 'budgets-options'],
    queryFn: categoriesApi.listAll,
    enabled: Boolean(userId),
  });
  const categoryNames = new Map(
    categoriesQuery.data?.map((category) => [category.id, category.name]) ?? [],
  );
  const expenseCategories =
    categoriesQuery.data?.filter((category) => category.type === 'EXPENSE') ??
    [];
  const createBudget = useMutation({ mutationFn: budgetsApi.create });
  const deleteBudget = useMutation({ mutationFn: budgetsApi.remove });
  const updateBudget = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BudgetFormValues }) =>
      budgetsApi.update(id, {
        categoryId: values.categoryId,
        month: `${values.month}-01`,
        limitAmount: values.limitAmount,
      }),
  });

  const saveBudget = async (values: BudgetFormValues): Promise<void> => {
    const input = {
      categoryId: values.categoryId,
      month: `${values.month}-01`,
      limitAmount: values.limitAmount,
    };
    if (editingBudget)
      await updateBudget.mutateAsync({ id: editingBudget.id, values });
    else await createBudget.mutateAsync(input);
    await invalidateBudgetDependents(queryClient, userId);
    setFormOpen(false);
    setEditingBudget(null);
    if (input.month !== month) changeMonth(input.month);
  };

  const openCreate = (): void => {
    setEditingBudget(null);
    setFormOpen(true);
  };
  const openEdit = (budget: Budget): void => {
    setEditingBudget(budget);
    setFormOpen(true);
  };
  const confirmDelete = async (budget: Budget): Promise<void> => {
    await deleteBudget.mutateAsync(budget.id);
    await invalidateBudgetDependents(queryClient, userId);
    setDeletingBudget(null);
  };

  const changeMonth = (nextMonth: string): void => {
    const next = new URLSearchParams(searchParams);
    next.set('month', nextMonth);
    next.delete('page');
    setSearchParams(next);
  };
  const changePage = (nextPage: number): void => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <Container component={'main'} maxWidth={'lg'} sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Typography component={'h1'} variant={'h3'}>
          Бюджеты
        </Typography>
        <MonthSelector month={month} onChange={changeMonth} />
        <Button
          variant={'contained'}
          onClick={openCreate}
          disabled={
            !categoriesQuery.isSuccess || expenseCategories.length === 0
          }
          sx={{ alignSelf: 'flex-start' }}
        >
          Добавить бюджет
        </Button>
        {categoriesQuery.isSuccess && expenseCategories.length === 0 ? (
          <Alert severity={'info'}>
            Для бюджета сначала создайте расходную категорию.
          </Alert>
        ) : null}
        {budgetsQuery.isPending || categoriesQuery.isPending ? (
          <PageSkeleton label="Загрузка бюджетов" heights={[150, 150]} />
        ) : budgetsQuery.isError || categoriesQuery.isError ? (
          <ErrorState
            message="Не удалось загрузить бюджеты."
            onRetry={() => {
              void budgetsQuery.refetch();
              void categoriesQuery.refetch();
            }}
          />
        ) : budgetsQuery.data.items.length === 0 ? (
          <EmptyState message="На этот месяц бюджетов пока нет." />
        ) : (
          <>
            <BudgetGrid
              budgets={budgetsQuery.data.items}
              categoryNames={categoryNames}
              onEdit={openEdit}
              onDelete={setDeletingBudget}
            />
            {budgetsQuery.data.meta.totalPages > 1 ? (
              <Pagination
                aria-label={'Страницы бюджетов'}
                count={budgetsQuery.data.meta.totalPages}
                page={page}
                onChange={(_event, nextPage) => changePage(nextPage)}
              />
            ) : null}
          </>
        )}
        <Button component={Link} to={'/'} sx={{ alignSelf: 'flex-start' }}>
          Вернуться на главную
        </Button>
        {formOpen ? (
          <BudgetFormDialog
            budget={editingBudget}
            month={month}
            categories={expenseCategories}
            onClose={() => setFormOpen(false)}
            onSave={saveBudget}
          />
        ) : null}
        {deletingBudget ? (
          <DeleteBudgetDialog
            budget={deletingBudget}
            categoryName={
              categoryNames.get(deletingBudget.categoryId) ??
              'Неизвестная категория'
            }
            onClose={() => setDeletingBudget(null)}
            onConfirm={confirmDelete}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
