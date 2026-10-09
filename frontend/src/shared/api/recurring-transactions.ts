import type { components } from './schema';
import { apiRequest } from './http';

export type RecurringRule =
  components['schemas']['RecurringTransactionResponseDto'];
export type RecurringRuleList =
  components['schemas']['RecurringTransactionListResponseDto'];
export type CreateRecurringRuleInput =
  components['schemas']['CreateRecurringTransactionDto'];
export type UpdateRecurringRuleInput =
  components['schemas']['UpdateRecurringTransactionDto'];

export interface RecurringRuleListParams {
  page: number;
  pageSize: number;
}

function ruleUrl(id: string): string {
  return `/api/v1/recurring-transactions/${encodeURIComponent(id)}`;
}

export const recurringRulesApi = {
  list: (params: RecurringRuleListParams): Promise<RecurringRuleList> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiRequest<RecurringRuleList>(
      `/api/v1/recurring-transactions?${query.toString()}`,
    );
  },
  create: (input: CreateRecurringRuleInput): Promise<RecurringRule> =>
    apiRequest<RecurringRule>('/api/v1/recurring-transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (
    id: string,
    input: UpdateRecurringRuleInput,
  ): Promise<RecurringRule> =>
    apiRequest<RecurringRule>(ruleUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string): Promise<void> =>
    apiRequest<void>(ruleUrl(id), { method: 'DELETE' }),
};
