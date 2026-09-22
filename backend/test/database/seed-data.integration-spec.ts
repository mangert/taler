import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for database integration tests');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const monthKey = (value: Date): string =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;

describe('seed data', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the expected number of entities', async () => {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.budget.count(),
      prisma.transaction.count(),
      prisma.recurringTransaction.count(),
      prisma.auditLog.count(),
    ]);

    expect(counts).toEqual([2, 12, 3, 240, 4, 243]);
  });

  it('distributes transactions across the current and previous five months', async () => {
    const transactions = await prisma.transaction.findMany({
      select: { transactionDate: true },
    });
    const now = new Date();
    const expectedMonths = Array.from({ length: 6 }, (_, monthOffset) => {
      const month = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1),
      );

      return monthKey(month);
    }).sort();
    const actualMonths = [
      ...new Set(
        transactions.map(({ transactionDate }) => monthKey(transactionDate)),
      ),
    ].sort();

    expect(transactions).toHaveLength(240);
    expect(actualMonths).toEqual(expectedMonths);
    expect(
      transactions.every(({ transactionDate }) => transactionDate <= now),
    ).toBe(true);
  });

  it('keeps every owned entity within its user boundary', async () => {
    const [users, transactions, budgets, recurringRules] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: 'asc' },
        select: {
          id: true,
          email: true,
          _count: {
            select: {
              categories: true,
              transactions: true,
              budgets: true,
              recurringRules: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        select: { userId: true, category: { select: { userId: true } } },
      }),
      prisma.budget.findMany({
        select: { userId: true, category: { select: { userId: true } } },
      }),
      prisma.recurringTransaction.findMany({
        select: { userId: true, category: { select: { userId: true } } },
      }),
    ]);

    expect(users.map(({ email }) => email)).toEqual([
      'family@taler.local',
      'personal@taler.local',
    ]);
    expect(users.map(({ _count }) => _count.categories)).toEqual([6, 6]);
    expect(users.map(({ _count }) => _count.transactions)).toEqual([120, 120]);
    expect(users.map(({ _count }) => _count.budgets)).toEqual([2, 1]);
    expect(users.map(({ _count }) => _count.recurringRules)).toEqual([2, 2]);

    for (const entity of [...transactions, ...budgets, ...recurringRules]) {
      expect(entity.category.userId).toBe(entity.userId);
    }
  });

  it('rejects a duplicate category name for the same user', async () => {
    const category = await prisma.category.findFirstOrThrow();

    await expect(
      prisma.category.create({
        data: {
          id: randomUUID(),
          userId: category.userId,
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a duplicate budget for the same user, category and month', async () => {
    const budget = await prisma.budget.findFirstOrThrow();

    await expect(
      prisma.budget.create({
        data: {
          id: randomUUID(),
          userId: budget.userId,
          categoryId: budget.categoryId,
          month: budget.month,
          limitAmount: budget.limitAmount,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a duplicate occurrence of a recurring transaction', async () => {
    const rule = await prisma.recurringTransaction.findFirstOrThrow();
    const scheduledDate = new Date(Date.UTC(2099, 0, 15));
    const firstOccurrence = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId: rule.userId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        exchangeRateToBase: rule.exchangeRateToBase,
        baseAmount: rule.amount.mul(rule.exchangeRateToBase).toDecimalPlaces(4),
        transactionDate: scheduledDate,
        description: 'Integration test occurrence',
        recurringTransactionId: rule.id,
        scheduledDate,
      },
    });

    try {
      await expect(
        prisma.transaction.create({
          data: {
            id: randomUUID(),
            userId: rule.userId,
            categoryId: rule.categoryId,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            exchangeRateToBase: rule.exchangeRateToBase,
            baseAmount: rule.amount
              .mul(rule.exchangeRateToBase)
              .toDecimalPlaces(4),
            transactionDate: scheduledDate,
            description: 'Duplicate integration test occurrence',
            recurringTransactionId: rule.id,
            scheduledDate,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma.transaction.delete({ where: { id: firstOccurrence.id } });
    }
  });

  it('preserves Decimal values beyond JavaScript safe integer precision', async () => {
    const category = await prisma.category.findFirstOrThrow();
    const exactAmount = '900719925474099.1234';
    const exactExchangeRate = '1.00000000';
    const transaction = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId: category.userId,
        categoryId: category.id,
        type: category.type,
        amount: new Prisma.Decimal(exactAmount),
        currency: 'USD',
        exchangeRateToBase: new Prisma.Decimal(exactExchangeRate),
        baseAmount: new Prisma.Decimal(exactAmount),
        transactionDate: new Date(Date.UTC(2099, 0, 16)),
        description: 'Decimal precision integration test',
      },
    });

    try {
      const persisted = await prisma.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
        select: {
          amount: true,
          exchangeRateToBase: true,
          baseAmount: true,
        },
      });

      expect(persisted.amount.toFixed(4)).toBe(exactAmount);
      expect(persisted.exchangeRateToBase.toFixed(8)).toBe(exactExchangeRate);
      expect(persisted.baseAmount.toFixed(4)).toBe(exactAmount);
    } finally {
      await prisma.transaction.delete({ where: { id: transaction.id } });
    }
  });
});
