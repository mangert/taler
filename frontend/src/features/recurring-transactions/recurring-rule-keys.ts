/** Хранит ключи кеша запросов для работы с повторяющимися операциями. */
import type { RecurringRuleListParams } from '../../shared/api/recurring-transactions';

export const recurringRuleKeys = {
  /** Формирует корневой ключ кеша повторяющихся операций. */
  all: (userId: string) => ['recurring-rules', userId] as const,
  /** Формирует ключ кеша списка повторяющихся операций. */
  list: (userId: string, params: RecurringRuleListParams) =>
    [
      ...recurringRuleKeys.all(userId),
      'list',
      params.page,
      params.pageSize,
    ] as const,
};
