import type { components } from './schema';
import { apiRequest } from './http';

export type Budget = components['schemas']['BudgetResponseDto'];
export type BudgetList = components['schemas']['BudgetListResponseDto'];
export type CreateBudgetInput = components['schemas']['CreateBudgetDto'];
export type UpdateBudgetInput = components['schemas']['UpdateBudgetDto'];

export interface BudgetListParams {
  month: string;
  page: number;
  pageSize: number;
}

function budgetUrl(id: string): string {
  return `/api/v1/budgets/${encodeURIComponent(id)}`;
}

export const budgetsApi = {
  list: (params: BudgetListParams): Promise<BudgetList> => {
    const query = new URLSearchParams({
      month: params.month,
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiRequest<BudgetList>(`/api/v1/budgets?${query.toString()}`);
  },
  create: (input: CreateBudgetInput): Promise<Budget> =>
    apiRequest<Budget>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateBudgetInput): Promise<Budget> =>
    apiRequest<Budget>(budgetUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string): Promise<void> =>
    apiRequest<void>(budgetUrl(id), { method: 'DELETE' }),
};
