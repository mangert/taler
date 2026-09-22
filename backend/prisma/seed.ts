import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';

import {
  AuditAction,
  AuditableEntityType,
  Prisma,
  PrismaClient,
  TransactionType,
} from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for seeding');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const stableUuid = (group: string, index: number): string =>
  `${group}-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

const userIds = {
  personal: stableUuid('10000000', 1),
  family: stableUuid('10000000', 2),
} as const;

const startOfMonth = (source: Date, monthOffset = 0): Date =>
  new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() - monthOffset, 1),
  );

const dateWithinMonth = (
  source: Date,
  monthOffset: number,
  seed: number,
): Date => {
  const month = startOfMonth(source, monthOffset);
  const lastDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const maximumDay = monthOffset === 0 ? source.getUTCDate() : lastDay;
  const day = (seed % maximumDay) + 1;

  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day));
};

const nextRunAt = (source: Date, dayOfMonth: number): Date => {
  const useNextMonth = source.getUTCDate() >= dayOfMonth;
  const month = new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth() + (useNextMonth ? 1 : 0),
      1,
    ),
  );
  const lastDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth(),
      Math.min(dayOfMonth, lastDay),
      9,
    ),
  );
};

const now = new Date();
const currentMonth = startOfMonth(now);

const categories = [
  {
    id: stableUuid('20000000', 1),
    userId: userIds.personal,
    name: 'Зарплата',
    icon: 'payments',
    color: '#2E7D32',
    type: TransactionType.INCOME,
  },
  {
    id: stableUuid('20000000', 2),
    userId: userIds.personal,
    name: 'Фриланс',
    icon: 'laptop',
    color: '#1565C0',
    type: TransactionType.INCOME,
  },
  {
    id: stableUuid('20000000', 3),
    userId: userIds.personal,
    name: 'Продукты',
    icon: 'shopping_cart',
    color: '#EF6C00',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 4),
    userId: userIds.personal,
    name: 'Транспорт',
    icon: 'directions_bus',
    color: '#6A1B9A',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 5),
    userId: userIds.personal,
    name: 'Жильё',
    icon: 'home',
    color: '#455A64',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 6),
    userId: userIds.personal,
    name: 'Здоровье',
    icon: 'medical_services',
    color: '#C62828',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 7),
    userId: userIds.family,
    name: 'Общий доход',
    icon: 'account_balance_wallet',
    color: '#2E7D32',
    type: TransactionType.INCOME,
  },
  {
    id: stableUuid('20000000', 8),
    userId: userIds.family,
    name: 'Подарки',
    icon: 'redeem',
    color: '#AD1457',
    type: TransactionType.INCOME,
  },
  {
    id: stableUuid('20000000', 9),
    userId: userIds.family,
    name: 'Супермаркет',
    icon: 'local_grocery_store',
    color: '#EF6C00',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 10),
    userId: userIds.family,
    name: 'Коммунальные услуги',
    icon: 'receipt_long',
    color: '#0277BD',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 11),
    userId: userIds.family,
    name: 'Образование',
    icon: 'school',
    color: '#6A1B9A',
    type: TransactionType.EXPENSE,
  },
  {
    id: stableUuid('20000000', 12),
    userId: userIds.family,
    name: 'Досуг',
    icon: 'theater_comedy',
    color: '#00838F',
    type: TransactionType.EXPENSE,
  },
] satisfies Prisma.CategoryCreateManyInput[];

const budgets = [
  {
    id: stableUuid('30000000', 1),
    userId: userIds.personal,
    categoryId: stableUuid('20000000', 3),
    month: currentMonth,
    limitAmount: new Prisma.Decimal('30000.0000'),
  },
  {
    id: stableUuid('30000000', 2),
    userId: userIds.family,
    categoryId: stableUuid('20000000', 9),
    month: currentMonth,
    limitAmount: new Prisma.Decimal('650.0000'),
  },
  {
    id: stableUuid('30000000', 3),
    userId: userIds.family,
    categoryId: stableUuid('20000000', 12),
    month: currentMonth,
    limitAmount: new Prisma.Decimal('250.0000'),
  },
] satisfies Prisma.BudgetCreateManyInput[];

const recurringRules = [
  {
    id: stableUuid('50000000', 1),
    userId: userIds.personal,
    categoryId: stableUuid('20000000', 1),
    type: TransactionType.INCOME,
    amount: new Prisma.Decimal('145000.0000'),
    currency: 'RUB',
    exchangeRateToBase: new Prisma.Decimal('1.00000000'),
    description: 'Ежемесячная зарплата',
    dayOfMonth: 5,
    startDate: startOfMonth(now, 5),
    nextRunAt: nextRunAt(now, 5),
    isActive: true,
  },
  {
    id: stableUuid('50000000', 2),
    userId: userIds.personal,
    categoryId: stableUuid('20000000', 5),
    type: TransactionType.EXPENSE,
    amount: new Prisma.Decimal('52000.0000'),
    currency: 'RUB',
    exchangeRateToBase: new Prisma.Decimal('1.00000000'),
    description: 'Аренда квартиры',
    dayOfMonth: 1,
    startDate: startOfMonth(now, 5),
    nextRunAt: nextRunAt(now, 1),
    isActive: true,
  },
  {
    id: stableUuid('50000000', 3),
    userId: userIds.family,
    categoryId: stableUuid('20000000', 7),
    type: TransactionType.INCOME,
    amount: new Prisma.Decimal('4200.0000'),
    currency: 'EUR',
    exchangeRateToBase: new Prisma.Decimal('1.00000000'),
    description: 'Общий доход семьи',
    dayOfMonth: 25,
    startDate: startOfMonth(now, 5),
    nextRunAt: nextRunAt(now, 25),
    isActive: true,
  },
  {
    id: stableUuid('50000000', 4),
    userId: userIds.family,
    categoryId: stableUuid('20000000', 10),
    type: TransactionType.EXPENSE,
    amount: new Prisma.Decimal('180.0000'),
    currency: 'EUR',
    exchangeRateToBase: new Prisma.Decimal('1.00000000'),
    description: 'Коммунальные услуги',
    dayOfMonth: 15,
    startDate: startOfMonth(now, 5),
    nextRunAt: nextRunAt(now, 15),
    isActive: true,
  },
] satisfies Prisma.RecurringTransactionCreateManyInput[];

const transactions = Array.from({ length: 240 }, (_, index) => {
  const isPersonal = index % 2 === 0;
  const perUserIndex = Math.floor(index / 2);
  const userId = isPersonal ? userIds.personal : userIds.family;
  const type =
    perUserIndex % 5 === 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
  const availableCategories = categories.filter(
    (category) => category.userId === userId && category.type === type,
  );
  const category =
    availableCategories[perUserIndex % availableCategories.length];
  const usesForeignCurrency = perUserIndex % 7 === 0;
  const currency = usesForeignCurrency ? 'USD' : isPersonal ? 'RUB' : 'EUR';
  const exchangeRate = usesForeignCurrency
    ? new Prisma.Decimal(isPersonal ? '92.50000000' : '0.92000000')
    : new Prisma.Decimal('1.00000000');
  const amount = new Prisma.Decimal(
    type === TransactionType.INCOME
      ? 90_000 + (perUserIndex % 8) * 7_500
      : 450 + (perUserIndex % 17) * 135,
  );
  const transactionDate = dateWithinMonth(
    now,
    perUserIndex % 6,
    perUserIndex * 7,
  );

  return {
    id: stableUuid('40000000', index + 1),
    userId,
    categoryId: category.id,
    type,
    amount,
    currency,
    exchangeRateToBase: exchangeRate,
    baseAmount: amount.mul(exchangeRate).toDecimalPlaces(4),
    transactionDate,
    description:
      type === TransactionType.INCOME
        ? `Доход ${perUserIndex + 1}`
        : `Покупка ${perUserIndex + 1}`,
  };
}) satisfies Prisma.TransactionCreateManyInput[];

const transactionAudits: Prisma.AuditLogCreateManyInput[] = transactions.map(
  (transaction, index) => ({
    id: stableUuid('60000000', index + 1),
    userId: transaction.userId,
    entityType: AuditableEntityType.TRANSACTION,
    entityId: transaction.id,
    action: AuditAction.CREATE,
    after: {
      id: transaction.id,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount.toFixed(4),
      currency: transaction.currency,
      exchangeRateToBase: transaction.exchangeRateToBase.toFixed(8),
      baseAmount: transaction.baseAmount.toFixed(4),
      transactionDate: transaction.transactionDate.toISOString().slice(0, 10),
      description: transaction.description,
    },
    createdAt: transaction.transactionDate,
  }),
);

const budgetAudits: Prisma.AuditLogCreateManyInput[] = budgets.map(
  (budget, index) => ({
    id: stableUuid('60000000', transactions.length + index + 1),
    userId: budget.userId,
    entityType: AuditableEntityType.BUDGET,
    entityId: budget.id,
    action: AuditAction.CREATE,
    after: {
      id: budget.id,
      categoryId: budget.categoryId,
      month: budget.month.toISOString().slice(0, 10),
      limitAmount: budget.limitAmount.toFixed(4),
    },
  }),
);

async function seed(): Promise<void> {
  const [personalPasswordHash, familyPasswordHash] = await Promise.all([
    hash('TalerPersonal2026!'),
    hash('TalerFamily2026!'),
  ]);

  await prisma.$transaction(
    async (transaction) => {
      const seededUserIds = Object.values(userIds);

      await transaction.auditLog.deleteMany({
        where: { userId: { in: seededUserIds } },
      });
      await transaction.transaction.deleteMany({
        where: { userId: { in: seededUserIds } },
      });
      await transaction.budget.deleteMany({
        where: { userId: { in: seededUserIds } },
      });
      await transaction.recurringTransaction.deleteMany({
        where: { userId: { in: seededUserIds } },
      });
      await transaction.category.deleteMany({
        where: { userId: { in: seededUserIds } },
      });

      await transaction.user.upsert({
        where: { id: userIds.personal },
        update: {
          email: 'personal@taler.local',
          passwordHash: personalPasswordHash,
          displayName: 'Личный',
          baseCurrency: 'RUB',
          timeZone: 'Europe/Moscow',
        },
        create: {
          id: userIds.personal,
          email: 'personal@taler.local',
          passwordHash: personalPasswordHash,
          displayName: 'Личный',
          baseCurrency: 'RUB',
          timeZone: 'Europe/Moscow',
        },
      });
      await transaction.user.upsert({
        where: { id: userIds.family },
        update: {
          email: 'family@taler.local',
          passwordHash: familyPasswordHash,
          displayName: 'Семейный',
          baseCurrency: 'EUR',
          timeZone: 'Europe/Amsterdam',
        },
        create: {
          id: userIds.family,
          email: 'family@taler.local',
          passwordHash: familyPasswordHash,
          displayName: 'Семейный',
          baseCurrency: 'EUR',
          timeZone: 'Europe/Amsterdam',
        },
      });

      await transaction.category.createMany({ data: categories });
      await transaction.budget.createMany({ data: budgets });
      await transaction.recurringTransaction.createMany({
        data: recurringRules,
      });
      await transaction.transaction.createMany({ data: transactions });
      await transaction.auditLog.createMany({
        data: [...transactionAudits, ...budgetAudits],
      });
    },
    { timeout: 60_000 },
  );

  console.log(
    `Seeded 2 users, ${categories.length} categories, ${budgets.length} budgets, ${transactions.length} transactions, ${recurringRules.length} recurring rules and ${transactionAudits.length + budgetAudits.length} audit logs.`,
  );
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
