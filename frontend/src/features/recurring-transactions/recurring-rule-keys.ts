import type { RecurringRuleListParams } from '../../shared/api/recurring-transactions';

export const recurringRuleKeys = {
  all: (userId: string) => ['recurring-rules', userId] as const,
  list: (userId: string, params: RecurringRuleListParams) =>
    [
      ...recurringRuleKeys.all(userId),
      'list',
      params.page,
      params.pageSize,
    ] as const,
};
