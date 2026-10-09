import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditAction,
  AuditableEntityType,
  Prisma,
} from '../generated/prisma/client.js';
import { transactionAuditSnapshot } from '../audit/audit-snapshot.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { followingOccurrence, localDate } from './recurrence.js';

@Injectable()
export class RecurringSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecurringSchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onApplicationBootstrap(): void {
    void this.runDue(new Date()).catch((error: unknown) =>
      this.logFailure(error),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  onCron(): void {
    void this.runDue(new Date()).catch((error: unknown) =>
      this.logFailure(error),
    );
  }

  async runDue(now: Date): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        const due = await this.prisma.recurringTransaction.findMany({
          where: { isActive: true, nextRunAt: { lte: now } },
          orderBy: [{ nextRunAt: 'asc' }, { id: 'asc' }],
          select: { id: true, nextRunAt: true },
          take: 50,
        });
        if (due.length === 0) return;
        let progressed = false;
        for (const rule of due) {
          progressed =
            (await this.processOccurrence(rule.id, rule.nextRunAt)) ||
            progressed;
        }
        // A concurrent worker may have claimed the whole batch.
        if (!progressed) return;
      }
    } finally {
      this.running = false;
    }
  }

  private async processOccurrence(
    id: string,
    expectedNextRunAt: Date,
  ): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (client) => {
        const rule = await client.recurringTransaction.findFirst({
          where: { id, isActive: true, nextRunAt: expectedNextRunAt },
          include: { user: { select: { timeZone: true } } },
        });
        if (!rule) return false;
        const scheduledDate = localDate(rule.nextRunAt, rule.user.timeZone);
        const next = followingOccurrence(
          scheduledDate,
          rule.dayOfMonth,
          rule.user.timeZone,
        );
        const expired =
          rule.endDate !== null &&
          scheduledDate > rule.endDate.toISOString().slice(0, 10);
        const finalOccurrence =
          rule.endDate !== null &&
          next.scheduledDate > rule.endDate.toISOString().slice(0, 10);
        const claim = await client.recurringTransaction.updateMany({
          where: { id, isActive: true, nextRunAt: expectedNextRunAt },
          data: {
            nextRunAt: next.nextRunAt,
            isActive: !expired && !finalOccurrence,
          },
        });
        if (claim.count !== 1) return false;
        if (expired) return true;

        const date = new Date(`${scheduledDate}T00:00:00.000Z`);
        const transaction = await client.transaction.create({
          data: {
            userId: rule.userId,
            categoryId: rule.categoryId,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            exchangeRateToBase: rule.exchangeRateToBase,
            baseAmount: rule.amount
              .mul(rule.exchangeRateToBase)
              .toDecimalPlaces(4),
            transactionDate: date,
            description: rule.description,
            recurringTransactionId: rule.id,
            scheduledDate: date,
          },
        });
        await this.audit.record(client, {
          userId: rule.userId,
          entityType: AuditableEntityType.TRANSACTION,
          entityId: transaction.id,
          action: AuditAction.CREATE,
          after: transactionAuditSnapshot(transaction),
        });
        return true;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (await this.advanceExistingOccurrence(id, expectedNextRunAt))
      )
        return true;
      throw error;
    }
  }

  private async advanceExistingOccurrence(
    id: string,
    expectedNextRunAt: Date,
  ): Promise<boolean> {
    const rule = await this.prisma.recurringTransaction.findUnique({
      where: { id },
      include: { user: { select: { timeZone: true } } },
    });
    if (!rule) return false;
    const scheduledDate = localDate(expectedNextRunAt, rule.user.timeZone);
    const existing = await this.prisma.transaction.findFirst({
      where: {
        recurringTransactionId: id,
        scheduledDate: new Date(`${scheduledDate}T00:00:00.000Z`),
      },
      select: { id: true },
    });
    if (!existing) return false;
    if (
      !rule.isActive ||
      rule.nextRunAt.getTime() !== expectedNextRunAt.getTime()
    )
      return true;
    const next = followingOccurrence(
      scheduledDate,
      rule.dayOfMonth,
      rule.user.timeZone,
    );
    const finalOccurrence =
      rule.endDate !== null &&
      next.scheduledDate > rule.endDate.toISOString().slice(0, 10);
    const result = await this.prisma.recurringTransaction.updateMany({
      where: { id, isActive: true, nextRunAt: expectedNextRunAt },
      data: { nextRunAt: next.nextRunAt, isActive: !finalOccurrence },
    });
    return result.count === 1;
  }

  private logFailure(error: unknown): void {
    this.logger.error(
      'Recurring transaction catch-up failed',
      error instanceof Error ? error.stack : String(error),
    );
  }
}
