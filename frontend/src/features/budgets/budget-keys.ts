/** Хранит ключи кеша запросов для работы с бюджетами. */
import type { BudgetListParams } from '../../shared/api/budgets';

export const budgetKeys = {
  /** Формирует корневой ключ кеша бюджетов. */
  all: (userId: string) => ['budgets', userId] as const,
  /** Формирует ключ кеша списка бюджетов. */
  list: (userId: string, params: BudgetListParams) =>
    [
      ...budgetKeys.all(userId),
      'list',
      params.month,
      params.page,
      params.pageSize,
    ] as const,
};
