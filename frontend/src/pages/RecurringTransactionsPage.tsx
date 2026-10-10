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
import { useAuth } from '../features/auth/auth-context';
import { RecurringRuleList } from '../features/recurring-transactions/RecurringRuleList';
import { RecurringRuleFormDialog } from '../features/recurring-transactions/RecurringRuleFormDialog';
import { DeleteRecurringRuleDialog } from '../features/recurring-transactions/DeleteRecurringRuleDialog';
import { recurringRuleKeys } from '../features/recurring-transactions/recurring-rule-keys';
import type { RecurringRuleFormValues } from '../features/recurring-transactions/recurring-rule-schema';
import { categoriesApi } from '../shared/api/categories';
import {
  recurringRulesApi,
  type CreateRecurringRuleInput,
  type RecurringRule,
} from '../shared/api/recurring-transactions';
import { EmptyState, ErrorState, PageSkeleton } from '../shared/ui/PageStates';

const pageSize = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function RecurringTransactionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = user?.id ?? '';
  const page = parsePage(searchParams.get('page'));
  const params = { page, pageSize };
  const rulesQuery = useQuery({
    queryKey: recurringRuleKeys.list(userId, params),
    queryFn: () => recurringRulesApi.list(params),
    enabled: Boolean(userId),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', userId, 'recurring-options'],
    queryFn: categoriesApi.listAll,
    enabled: Boolean(userId),
  });
  const categoryNames = new Map(
    categoriesQuery.data?.map((category) => [category.id, category.name]) ?? [],
  );
  const createRule = useMutation({ mutationFn: recurringRulesApi.create });
  const updateRule = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CreateRecurringRuleInput;
    }) => recurringRulesApi.update(id, input),
  });
  const deleteRule = useMutation({ mutationFn: recurringRulesApi.remove });
  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      recurringRulesApi.update(id, { isActive }),
  });

  const refreshRules = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: recurringRuleKeys.all(userId),
    });
  };
  const saveRule = async (values: RecurringRuleFormValues): Promise<void> => {
    const input: CreateRecurringRuleInput = {
      categoryId: values.categoryId,
      type: values.type,
      amount: values.amount,
      currency: values.currency,
      exchangeRateToBase:
        values.currency === user?.baseCurrency
          ? '1'
          : values.exchangeRateToBase,
      dayOfMonth: Number(values.dayOfMonth),
      startDate: values.startDate,
      endDate: values.endDate || null,
      description: values.description.trim() || null,
    };
    if (editingRule)
      await updateRule.mutateAsync({ id: editingRule.id, input });
    else await createRule.mutateAsync(input);
    await refreshRules();
    setFormOpen(false);
    setEditingRule(null);
  };
  const toggleRule = async (rule: RecurringRule): Promise<void> => {
    setToggleError(null);
    try {
      await toggleRuleMutation.mutateAsync({
        id: rule.id,
        isActive: !rule.isActive,
      });
      await refreshRules();
    } catch {
      setToggleError(
        `Не удалось ${rule.isActive ? 'приостановить' : 'возобновить'} правило. Попробуйте ещё раз.`,
      );
    }
  };
  const confirmDelete = async (rule: RecurringRule): Promise<void> => {
    await deleteRule.mutateAsync(rule.id);
    await refreshRules();
    setDeletingRule(null);
    if (page > 1 && rulesQuery.data?.items.length === 1) changePage(page - 1);
  };

  const changePage = (nextPage: number): void => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Typography component="h1" variant="h3">
          Повторяющиеся транзакции
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingRule(null);
            setFormOpen(true);
          }}
          disabled={
            !categoriesQuery.isSuccess || categoriesQuery.data.length === 0
          }
          sx={{ alignSelf: 'flex-start' }}
        >
          Добавить правило
        </Button>
        {categoriesQuery.isSuccess && categoriesQuery.data.length === 0 ? (
          <Alert severity="info">Для правила сначала создайте категорию.</Alert>
        ) : null}
        {toggleError ? (
          <Alert severity="error" onClose={() => setToggleError(null)}>
            {toggleError}
          </Alert>
        ) : null}
        {rulesQuery.isPending || categoriesQuery.isPending ? (
          <PageSkeleton
            label="Загрузка повторяющихся транзакций"
            heights={[150, 150]}
          />
        ) : rulesQuery.isError || categoriesQuery.isError ? (
          <ErrorState
            message="Не удалось загрузить повторяющиеся транзакции."
            onRetry={() => {
              void rulesQuery.refetch();
              void categoriesQuery.refetch();
            }}
          />
        ) : rulesQuery.data.items.length === 0 ? (
          <EmptyState message="Повторяющихся правил пока нет." />
        ) : (
          <>
            <RecurringRuleList
              rules={rulesQuery.data.items}
              categoryNames={categoryNames}
              baseCurrency={user?.baseCurrency ?? ''}
              timeZone={user?.timeZone ?? 'UTC'}
              onEdit={(rule) => {
                setEditingRule(rule);
                setFormOpen(true);
              }}
              onToggle={(rule) => {
                void toggleRule(rule);
              }}
              onDelete={setDeletingRule}
              togglingId={
                toggleRuleMutation.isPending
                  ? toggleRuleMutation.variables.id
                  : null
              }
            />
            {rulesQuery.data.meta.totalPages > 1 ? (
              <Pagination
                aria-label="Страницы повторяющихся правил"
                count={rulesQuery.data.meta.totalPages}
                page={page}
                onChange={(_event, nextPage) => changePage(nextPage)}
              />
            ) : null}
          </>
        )}
        <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
          Вернуться на главную
        </Button>
        {formOpen && categoriesQuery.data && user ? (
          <RecurringRuleFormDialog
            rule={editingRule}
            categories={categoriesQuery.data}
            baseCurrency={user.baseCurrency}
            onClose={() => setFormOpen(false)}
            onSave={saveRule}
          />
        ) : null}
        {deletingRule ? (
          <DeleteRecurringRuleDialog
            rule={deletingRule}
            categoryName={
              categoryNames.get(deletingRule.categoryId) ??
              'Неизвестная категория'
            }
            onClose={() => setDeletingRule(null)}
            onConfirm={confirmDelete}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
