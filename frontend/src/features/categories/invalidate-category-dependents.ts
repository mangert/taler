/** Обновляет кеш после изменения данных, связанных с категориями. */
import type { QueryClient } from '@tanstack/react-query';
import { categoryKeys } from './category-keys';
import { dashboardKeys } from '../dashboard/dashboard-keys';

/** Обновляет запросы, зависящие от категорий. */
export async function invalidateCategoryDependents(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all(userId) }),
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
  ]);
}
