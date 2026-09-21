import { SortDirection } from '../common/enums/sort-direction.enum.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TransactionType as PrismaTransactionType } from '../../generated/prisma/client.js';
import { TransactionType } from './enums/transaction-type.enum.js';
import {
  buildTransactionWhere,
  createDefaultTransactionOrderBy,
} from './transaction-query.builder.js';

describe('transaction query builder', () => {
  it('sorts newest transactions first with a unique deterministic tie-breaker', () => {
    expect(createDefaultTransactionOrderBy()).toEqual([
      { transactionDate: SortDirection.DESC },
      { id: SortDirection.DESC },
    ]);
  });

  it('always scopes transaction filters to the authenticated user', () => {
    expect(buildTransactionWhere('current-user-id', {})).toEqual({
      userId: 'current-user-id',
    });
  });

  it('combines all supported filters without losing decimal precision', () => {
    expect(
      buildTransactionWhere('current-user-id', {
        search: '  monthly rent  ',
        dateFrom: '2026-04-01',
        dateTo: '2026-09-30',
        categoryId: '20000000-0000-4000-8000-000000000005',
        minAmount: '900719925474099.1234',
        maxAmount: '900719925474999.9999',
        type: TransactionType.EXPENSE,
      }),
    ).toEqual({
      userId: 'current-user-id',
      description: {
        contains: 'monthly rent',
        mode: 'insensitive',
      },
      transactionDate: {
        gte: '2026-04-01',
        lte: '2026-09-30',
      },
      categoryId: '20000000-0000-4000-8000-000000000005',
      amount: {
        gte: '900719925474099.1234',
        lte: '900719925474999.9999',
      },
      type: PrismaTransactionType.EXPENSE,
    });
  });

  it('omits an empty description search', () => {
    expect(buildTransactionWhere('current-user-id', { search: '   ' })).toEqual(
      {
        userId: 'current-user-id',
      },
    );
  });

  it('produces inputs compatible with Prisma queries', () => {
    const where: Prisma.TransactionWhereInput = buildTransactionWhere(
      'current-user-id',
      { type: TransactionType.INCOME },
    );
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      createDefaultTransactionOrderBy();

    expect(where.type).toBe(PrismaTransactionType.INCOME);
    expect(orderBy).toHaveLength(2);
  });
});
