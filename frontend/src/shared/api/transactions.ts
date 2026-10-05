import type { components } from './schema';
import { apiRequest } from './http';

export type Transaction = components['schemas']['TransactionResponseDto'];
export type TransactionList =
  components['schemas']['TransactionListResponseDto'];
export type CreateTransactionInput =
  components['schemas']['CreateTransactionDto'];
export type UpdateTransactionInput =
  components['schemas']['UpdateTransactionDto'];
export type TransactionType = Transaction['type'];

export interface TransactionListParams {
  search: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  minAmount: string;
  maxAmount: string;
  type: '' | TransactionType;
  page: number;
  pageSize: number;
}

function transactionUrl(id: string): string {
  return `/api/v1/transactions/${encodeURIComponent(id)}`;
}

export const transactionsApi = {
  get: (id: string): Promise<Transaction> =>
    apiRequest<Transaction>(transactionUrl(id)),
  list: (params: TransactionListParams): Promise<TransactionList> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    for (const key of [
      'search',
      'dateFrom',
      'dateTo',
      'categoryId',
      'minAmount',
      'maxAmount',
      'type',
    ] as const) {
      if (params[key]) query.set(key, params[key]);
    }
    return apiRequest<TransactionList>(
      `/api/v1/transactions?${query.toString()}`,
    );
  },
  create: (input: CreateTransactionInput): Promise<Transaction> =>
    apiRequest<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateTransactionInput): Promise<Transaction> =>
    apiRequest<Transaction>(transactionUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string): Promise<void> =>
    apiRequest<void>(transactionUrl(id), { method: 'DELETE' }),
};
