import { SortDirection } from '../common/enums/sort-direction.enum.js';
import { TransactionType } from './enums/transaction-type.enum.js';

export interface TransactionFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  minAmount?: string;
  maxAmount?: string;
  type?: TransactionType;
}

export interface TransactionWhere {
  userId: string;
  description?: {
    contains: string;
    mode: 'insensitive';
  };
  transactionDate?: {
    gte?: string;
    lte?: string;
  };
  categoryId?: string;
  amount?: {
    gte?: string;
    lte?: string;
  };
  type?: TransactionType;
}

export type TransactionOrderBy = [
  { transactionDate: SortDirection.DESC },
  { id: SortDirection.DESC },
];

export function buildTransactionWhere(
  userId: string,
  filters: Readonly<TransactionFilters>,
): TransactionWhere {
  const where: TransactionWhere = { userId };
  const search = filters.search?.trim();

  if (search) {
    where.description = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (filters.dateFrom !== undefined || filters.dateTo !== undefined) {
    where.transactionDate = {
      ...(filters.dateFrom === undefined ? {} : { gte: filters.dateFrom }),
      ...(filters.dateTo === undefined ? {} : { lte: filters.dateTo }),
    };
  }

  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {
      ...(filters.minAmount === undefined ? {} : { gte: filters.minAmount }),
      ...(filters.maxAmount === undefined ? {} : { lte: filters.maxAmount }),
    };
  }

  if (filters.type !== undefined) {
    where.type = filters.type;
  }

  return where;
}

export function createDefaultTransactionOrderBy(): TransactionOrderBy {
  return [{ transactionDate: SortDirection.DESC }, { id: SortDirection.DESC }];
}
