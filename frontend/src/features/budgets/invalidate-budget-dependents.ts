/** Обновляет кеш после изменения данных, связанных с бюджетами. */
import type { QueryClient } from '@tanstack/react-query';
import { auditKeys } from '../audit/audit-keys';
import { dashboardKeys } from '../dashboard/dashboard-keys';
import { budgetKeys } from './budget-keys';

/** Обновляет запросы, зависящие от бюджетов. */
export async function invalidateBudgetDependents(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all(userId) }),
    queryClient.invalidateQueries({ queryKey: auditKeys.all(userId) }),
  ]);
}
