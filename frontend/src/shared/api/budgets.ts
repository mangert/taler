/** Описывает клиентские запросы к API бюджетов. */
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

/** Формирует адрес API для бюджета. */
function budgetUrl(id: string): string {
  return `/api/v1/budgets/${encodeURIComponent(id)}`;
}

export const budgetsApi = {
  /** Загружает список бюджетов из API. */
  list: (params: BudgetListParams): Promise<BudgetList> => {
    const query = new URLSearchParams({
      month: params.month,
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiRequest<BudgetList>(`/api/v1/budgets?${query.toString()}`);
  },
  /** Создаёт бюджет через API. */
  create: (input: CreateBudgetInput): Promise<Budget> =>
    apiRequest<Budget>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  /** Обновляет бюджет через API. */
  update: (id: string, input: UpdateBudgetInput): Promise<Budget> =>
    apiRequest<Budget>(budgetUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  /** Удаляет бюджет через API. */
  remove: (id: string): Promise<void> =>
    apiRequest<void>(budgetUrl(id), { method: 'DELETE' }),
};
