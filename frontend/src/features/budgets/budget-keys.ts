import type { BudgetListParams } from '../../shared/api/budgets';

export const budgetKeys = {
  all: (userId: string) => ['budgets', userId] as const,
  list: (userId: string, params: BudgetListParams) =>
    [
      ...budgetKeys.all(userId),
      'list',
      params.month,
      params.page,
      params.pageSize,
    ] as const,
};
