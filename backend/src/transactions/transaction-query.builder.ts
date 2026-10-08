import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { SortDirection } from '../common/enums/sort-direction.enum.js';
type TransactionType = 'INCOME' | 'EXPENSE';

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

function parseDate(value: string): Date {
  const date = new Date(value + 'T00:00:00.000Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'Date must be a valid YYYY-MM-DD value',
    });
  }
  return date;
}

export function buildTransactionPrismaWhere(
  userId: string,
  filters: Readonly<TransactionFilters>,
): Prisma.TransactionWhereInput {
  if (filters.dateFrom) parseDate(filters.dateFrom);
  if (filters.dateTo) parseDate(filters.dateTo);
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'dateFrom must not exceed dateTo',
    });
  }
  if (
    filters.minAmount &&
    filters.maxAmount &&
    new Prisma.Decimal(filters.minAmount).gt(filters.maxAmount)
  ) {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT_RANGE',
      message: 'minAmount must not exceed maxAmount',
    });
  }
  const built = buildTransactionWhere(userId, filters);
  return {
    ...built,
    ...(built.transactionDate
      ? {
          transactionDate: {
            ...(built.transactionDate.gte
              ? { gte: parseDate(built.transactionDate.gte) }
              : {}),
            ...(built.transactionDate.lte
              ? { lte: parseDate(built.transactionDate.lte) }
              : {}),
          },
        }
      : {}),
  };
}
