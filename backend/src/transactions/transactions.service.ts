import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditableEntityType,
  Prisma,
  type Transaction,
  type TransactionType,
} from '../generated/prisma/client.js';
import { transactionAuditSnapshot } from '../audit/audit-snapshot.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import {
  TransactionListResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import {
  buildTransactionPrismaWhere,
  createDefaultTransactionOrderBy,
} from './transaction-query.builder.js';

function toResponse(record: Transaction): TransactionResponseDto {
  return {
    id: record.id,
    categoryId: record.categoryId,
    type: record.type,
    amount: record.amount.toFixed(4),
    currency: record.currency,
    exchangeRateToBase: record.exchangeRateToBase.toFixed(8),
    baseAmount: record.baseAmount.toFixed(4),
    transactionDate: record.transactionDate.toISOString().slice(0, 10),
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function dateValue(value: string): Date {
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

function positive(value: string, field: string): Prisma.Decimal {
  const decimal = new Prisma.Decimal(value);
  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT',
      message: field + ' must be positive',
    });
  }
  return decimal;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    userId: string,
    query: ListTransactionsQueryDto,
  ): Promise<TransactionListResponseDto> {
    const where = buildTransactionPrismaWhere(userId, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [records, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: createDefaultTransactionOrderBy(),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return {
      items: records.map(toResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(userId: string, id: string): Promise<TransactionResponseDto> {
    return toResponse(await this.getOwned(userId, id));
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const baseCurrency = await this.getBaseCurrency(userId);
    await this.assertCategory(userId, dto.categoryId, dto.type);
    const money = this.money(
      dto.amount,
      dto.currency,
      dto.exchangeRateToBase,
      baseCurrency,
    );
    const transactionDate = dateValue(dto.transactionDate);
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.transaction.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          type: dto.type,
          ...money,
          transactionDate,
          description: dto.description ?? null,
        },
      });
      await this.audit.record(transaction, {
        userId,
        entityType: AuditableEntityType.TRANSACTION,
        entityId: record.id,
        action: AuditAction.CREATE,
        after: transactionAuditSnapshot(record),
      });
      return toResponse(record);
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE',
        message: 'At least one transaction field is required',
      });
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await this.getOwned(userId, id, transaction);
        const categoryId = dto.categoryId ?? current.categoryId;
        const type = dto.type ?? current.type;
        await this.assertCategory(userId, categoryId, type, transaction);
        const baseCurrency = await this.getBaseCurrency(userId, transaction);
        const money = this.money(
          dto.amount ?? current.amount.toString(),
          dto.currency ?? current.currency,
          dto.exchangeRateToBase ?? current.exchangeRateToBase.toString(),
          baseCurrency,
        );
        const record = await transaction.transaction.update({
          where: { id, userId },
          data: {
            ...(dto.categoryId !== undefined ? { categoryId } : {}),
            ...(dto.type !== undefined ? { type } : {}),
            ...(dto.amount !== undefined ? { amount: money.amount } : {}),
            ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
            ...(dto.exchangeRateToBase !== undefined
              ? { exchangeRateToBase: money.exchangeRateToBase }
              : {}),
            baseAmount: money.baseAmount,
            ...(dto.transactionDate !== undefined
              ? { transactionDate: dateValue(dto.transactionDate) }
              : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
          },
        });
        await this.audit.record(transaction, {
          userId,
          entityType: AuditableEntityType.TRANSACTION,
          entityId: id,
          action: AuditAction.UPDATE,
          before: transactionAuditSnapshot(current),
          after: transactionAuditSnapshot(record),
        });
        return toResponse(record);
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
      await this.prisma.$transaction(async (transaction) => {
        const current = await this.getOwned(userId, id, transaction);
        await transaction.transaction.delete({ where: { id, userId } });
        await this.audit.record(transaction, {
          userId,
          entityType: AuditableEntityType.TRANSACTION,
          entityId: id,
          action: AuditAction.DELETE,
          before: transactionAuditSnapshot(current),
        });
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

  private money(
    amountInput: string,
    currency: string,
    rateInput: string,
    baseCurrency: string,
  ) {
    const amount = positive(amountInput, 'amount');
    const exchangeRateToBase = positive(rateInput, 'exchangeRateToBase');
    if (currency === baseCurrency && !exchangeRateToBase.eq(1)) {
      throw new BadRequestException({
        code: 'INVALID_BASE_CURRENCY_RATE',
        message: 'Base currency exchange rate must equal 1',
      });
    }
    const baseAmount = amount.mul(exchangeRateToBase).toDecimalPlaces(4);
    if (baseAmount.gte('1000000000000000')) {
      throw new BadRequestException({
        code: 'BASE_AMOUNT_OVERFLOW',
        message: 'Calculated base amount exceeds supported precision',
      });
    }
    return { amount, currency, exchangeRateToBase, baseAmount };
  }

  private async getBaseCurrency(
    userId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    if (!user)
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Authentication is required',
      });
    return user.baseCurrency;
  }

  private async assertCategory(
    userId: string,
    id: string,
    type: TransactionType,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const category = await client.category.findFirst({
      where: { id, userId },
    });
    if (!category)
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    if (category.type !== type) {
      throw new BadRequestException({
        code: 'CATEGORY_TYPE_MISMATCH',
        message: 'Category type must match transaction type',
      });
    }
  }

  private async getOwned(
    userId: string,
    id: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<Transaction> {
    const record = await client.transaction.findFirst({
      where: { id, userId },
    });
    if (!record) this.notFound();
    return record;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'TRANSACTION_NOT_FOUND',
      message: 'Transaction not found',
    });
  }
}
