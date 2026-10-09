import { jest } from '@jest/globals';
import { AuditService } from '../audit/audit.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecurringSchedulerService } from './recurring-scheduler.service.js';

describe('recurring scheduler', () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    ['2028-02-29', 1],
    ['2028-02-28', 0],
  ])(
    'respects inclusive endDate %s with a fake clock',
    async (endDate, expectedTransactions) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2028-03-01T00:00:00.000Z'));
      const id = '11111111-1111-4111-8111-111111111111';
      const nextRunAt = new Date('2028-02-29T00:00:00.000Z');
      let active = true;
      let created = 0;
      const auditRecord = jest.fn(async () => undefined);
      const rule = {
        id,
        userId: '22222222-2222-4222-8222-222222222222',
        categoryId: '33333333-3333-4333-8333-333333333333',
        type: 'EXPENSE',
        amount: new Prisma.Decimal('10'),
        currency: 'EUR',
        exchangeRateToBase: new Prisma.Decimal('1'),
        description: null,
        dayOfMonth: 29,
        nextRunAt,
        endDate: new Date(`${endDate}T00:00:00.000Z`),
        user: { timeZone: 'UTC' },
      };
      const client = {
        recurringTransaction: {
          findFirst: async () => (active ? rule : null),
          updateMany: async (args: {
            data: { nextRunAt: Date; isActive: boolean };
          }) => {
            expect(args.data.nextRunAt.toISOString()).toBe(
              '2028-03-29T00:00:00.000Z',
            );
            active = args.data.isActive;
            return { count: 1 };
          },
        },
        transaction: {
          create: async () => {
            created += 1;
            return {
              id: '44444444-4444-4444-8444-444444444444',
              categoryId: rule.categoryId,
              type: 'EXPENSE',
              amount: rule.amount,
              currency: rule.currency,
              exchangeRateToBase: rule.exchangeRateToBase,
              baseAmount: rule.amount,
              transactionDate: nextRunAt,
              description: null,
            };
          },
        },
      };
      const prisma = {
        recurringTransaction: {
          findMany: async () => (active ? [{ id, nextRunAt }] : []),
        },
        $transaction: async (
          callback: (transactionClient: typeof client) => Promise<boolean>,
        ) => callback(client),
      } as unknown as PrismaService;
      const scheduler = new RecurringSchedulerService(prisma, {
        record: auditRecord,
      } as unknown as AuditService);

      await scheduler.runDue(new Date());

      expect(active).toBe(false);
      expect(created).toBe(expectedTransactions);
      expect(auditRecord).toHaveBeenCalledTimes(expectedTransactions);
    },
  );

  it('treats a unique conflict as handled when another worker advanced the same occurrence', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const expectedNextRunAt = new Date('2024-01-31T00:00:00.000Z');
    let scans = 0;
    const prisma = {
      recurringTransaction: {
        findMany: async () =>
          scans++ === 0 ? [{ id, nextRunAt: expectedNextRunAt }] : [],
        findFirst: async () => null,
        findUnique: async () => ({
          id,
          isActive: true,
          nextRunAt: new Date('2024-02-29T00:00:00.000Z'),
          dayOfMonth: 31,
          endDate: null,
          user: { timeZone: 'UTC' },
        }),
      },
      transaction: {
        findFirst: async (args: { where: { scheduledDate: Date } }) => {
          expect(args.where.scheduledDate.toISOString()).toBe(
            '2024-01-31T00:00:00.000Z',
          );
          return { id: '22222222-2222-4222-8222-222222222222' };
        },
      },
      $transaction: async () => {
        throw new Prisma.PrismaClientKnownRequestError('duplicate occurrence', {
          code: 'P2002',
          clientVersion: '7.10.0',
        });
      },
    } as unknown as PrismaService;
    const scheduler = new RecurringSchedulerService(prisma, new AuditService());

    await expect(
      scheduler.runDue(new Date('2024-02-01T00:00:00.000Z')),
    ).resolves.toBeUndefined();
  });
});
