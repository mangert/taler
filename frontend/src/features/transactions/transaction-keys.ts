import type { TransactionListParams } from '../../shared/api/transactions';

export const transactionKeys = {
  all: (userId: string) => ['transactions', userId] as const,
  detail: (userId: string, id: string) =>
    [...transactionKeys.all(userId), 'detail', id] as const,
  list: (userId: string, params: TransactionListParams) =>
    [
      ...transactionKeys.all(userId),
      'list',
      params.search,
      params.dateFrom,
      params.dateTo,
      params.categoryId,
      params.minAmount,
      params.maxAmount,
      params.type,
      params.page,
      params.pageSize,
    ] as const,
};
