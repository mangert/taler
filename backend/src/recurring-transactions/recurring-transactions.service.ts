import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  type RecurringTransaction,
  type TransactionType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto.js';
import { ListRecurringTransactionsQueryDto } from './dto/list-recurring-transactions-query.dto.js';
import {
  RecurringTransactionListResponseDto,
  RecurringTransactionResponseDto,
} from './dto/recurring-transaction-response.dto.js';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto.js';
import { nextOccurrence } from './recurrence.js';

function response(rule: RecurringTransaction): RecurringTransactionResponseDto {
  return {
    id: rule.id,
    categoryId: rule.categoryId,
    type: rule.type,
    amount: rule.amount.toFixed(4),
    currency: rule.currency,
    exchangeRateToBase: rule.exchangeRateToBase.toFixed(8),
    description: rule.description,
    dayOfMonth: rule.dayOfMonth,
    startDate: rule.startDate.toISOString().slice(0, 10),
    endDate: rule.endDate?.toISOString().slice(0, 10) ?? null,
    nextRunAt: rule.nextRunAt.toISOString(),
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function calendarDate(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(result.getTime()) ||
    result.getUTCFullYear() < 1 ||
    result.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'Date must be a valid YYYY-MM-DD value',
    });
  }
  return result;
}

function money(
  amountInput: string,
  currency: string,
  rateInput: string,
  baseCurrency: string,
) {
  const amount = new Prisma.Decimal(amountInput);
  const exchangeRateToBase = new Prisma.Decimal(rateInput);
  if (
    !amount.isFinite() ||
    amount.lte(0) ||
    !exchangeRateToBase.isFinite() ||
    exchangeRateToBase.lte(0)
  ) {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT',
      message: 'Amount and exchange rate must be positive',
    });
  }
  if (currency === baseCurrency && !exchangeRateToBase.eq(1)) {
    throw new BadRequestException({
      code: 'INVALID_BASE_CURRENCY_RATE',
      message: 'Base currency exchange rate must equal 1',
    });
  }
  if (
    amount.mul(exchangeRateToBase).toDecimalPlaces(4).gte('1000000000000000')
  ) {
    throw new BadRequestException({
      code: 'BASE_AMOUNT_OVERFLOW',
      message: 'Calculated base amount exceeds supported precision',
    });
  }
  return { amount, currency, exchangeRateToBase };
}

@Injectable()
export class RecurringTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListRecurringTransactionsQueryDto,
  ): Promise<RecurringTransactionListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.RecurringTransactionWhereInput = { userId };
    const [rules, total] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where,
        orderBy: [{ nextRunAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.recurringTransaction.count({ where }),
    ]);
    return {
      items: rules.map(response),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(
    userId: string,
    id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return response(await this.getOwned(this.prisma, userId, id));
  }

  async create(
    userId: string,
    dto: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    const user = await this.getUser(userId);
    const startDate = calendarDate(dto.startDate);
    const endDate = dto.endDate ? calendarDate(dto.endDate) : null;
    this.assertDateRange(startDate, endDate);
    const values = money(
      dto.amount,
      dto.currency,
      dto.exchangeRateToBase,
      user.baseCurrency,
    );
    const occurrence = nextOccurrence(
      dto.startDate,
      dto.dayOfMonth,
      user.timeZone,
    );
    return this.prisma.$transaction(async (transaction) => {
      await this.assertCategory(transaction, userId, dto.categoryId, dto.type);
      const rule = await transaction.recurringTransaction.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          type: dto.type,
          ...values,
          description: dto.description ?? null,
          dayOfMonth: dto.dayOfMonth,
          startDate,
          endDate,
          nextRunAt: occurrence.nextRunAt,
          isActive: dto.isActive ?? true,
        },
      });
      return response(rule);
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE',
        message: 'At least one recurring rule field is required',
      });
    }
    const user = await this.getUser(userId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await this.getOwned(transaction, userId, id);
        const categoryId = dto.categoryId ?? current.categoryId;
        const type = dto.type ?? current.type;
        await this.assertCategory(transaction, userId, categoryId, type);
        const values = money(
          dto.amount ?? current.amount.toString(),
          dto.currency ?? current.currency,
          dto.exchangeRateToBase ?? current.exchangeRateToBase.toString(),
          user.baseCurrency,
        );
        const startDate =
          dto.startDate !== undefined
            ? calendarDate(dto.startDate)
            : current.startDate;
        const endDate =
          dto.endDate === undefined
            ? current.endDate
            : dto.endDate === null
              ? null
              : calendarDate(dto.endDate);
        this.assertDateRange(startDate, endDate);
        const occurrence =
          dto.startDate !== undefined || dto.dayOfMonth !== undefined
            ? nextOccurrence(
                startDate.toISOString().slice(0, 10),
                dto.dayOfMonth ?? current.dayOfMonth,
                user.timeZone,
              )
            : null;
        const rule = await transaction.recurringTransaction.update({
          where: { id, userId },
          data: {
            ...(dto.categoryId !== undefined ? { categoryId } : {}),
            ...(dto.type !== undefined ? { type } : {}),
            ...(dto.amount !== undefined ? { amount: values.amount } : {}),
            ...(dto.currency !== undefined
              ? { currency: values.currency }
              : {}),
            ...(dto.exchangeRateToBase !== undefined
              ? { exchangeRateToBase: values.exchangeRateToBase }
              : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
            ...(dto.dayOfMonth !== undefined
              ? { dayOfMonth: dto.dayOfMonth }
              : {}),
            ...(dto.startDate !== undefined ? { startDate } : {}),
            ...(dto.endDate !== undefined ? { endDate } : {}),
            ...(occurrence ? { nextRunAt: occurrence.nextRunAt } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });
        return response(rule);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        this.notFound();
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.recurringTransaction.delete({ where: { id, userId } });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        this.notFound();
      throw error;
    }
  }

  private async getUser(
    userId: string,
  ): Promise<{ baseCurrency: string; timeZone: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true, timeZone: true },
    });
    if (!user)
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Authentication is required',
      });
    return user;
  }

  private async getOwned(
    client: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<RecurringTransaction> {
    const rule = await client.recurringTransaction.findFirst({
      where: { id, userId },
    });
    if (!rule) this.notFound();
    return rule;
  }

  private async assertCategory(
    client: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    type: TransactionType,
  ): Promise<void> {
    const category = await client.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category)
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    if (category.type !== type)
      throw new BadRequestException({
        code: 'CATEGORY_TYPE_MISMATCH',
        message: 'Category type must match recurring transaction type',
      });
  }

  private assertDateRange(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate < startDate)
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'endDate must not precede startDate',
      });
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'RECURRING_RULE_NOT_FOUND',
      message: 'Recurring rule not found',
    });
  }
}
