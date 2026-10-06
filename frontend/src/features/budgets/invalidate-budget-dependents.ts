import type { QueryClient } from '@tanstack/react-query';
import { auditKeys } from '../audit/audit-keys';
import { dashboardKeys } from '../dashboard/dashboard-keys';
import { budgetKeys } from './budget-keys';

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
