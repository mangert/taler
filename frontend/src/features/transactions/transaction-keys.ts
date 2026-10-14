/** Хранит ключи кеша запросов для работы с транзакциями. */
import type { TransactionListParams } from '../../shared/api/transactions';

export const transactionKeys = {
  /** Формирует корневой ключ кеша транзакций. */
  all: (userId: string) => ['transactions', userId] as const,
  /** Формирует ключ кеша отдельной транзакции. */
  detail: (userId: string, id: string) =>
    [...transactionKeys.all(userId), 'detail', id] as const,
  /** Формирует ключ кеша списка транзакций. */
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
