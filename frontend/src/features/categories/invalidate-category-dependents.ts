import type { QueryClient } from '@tanstack/react-query';
import { categoryKeys } from './category-keys';

export async function invalidateCategoryDependents(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
  ]);
}
