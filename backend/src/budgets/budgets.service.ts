import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditableEntityType,
  Prisma,
  TransactionType,
  type Budget,
} from '../generated/prisma/client.js';
import { budgetAuditSnapshot } from '../audit/audit-snapshot.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BudgetResponseDto } from './dto/budget-response.dto.js';
import { BudgetListResponseDto } from './dto/budget-response.dto.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';
import { currentBudgetMonth, nextBudgetMonth } from './budget-month.js';

function toResponse(
  budget: Budget,
  currency: string,
  spent: Prisma.Decimal,
): BudgetResponseDto {
  const remaining = budget.limitAmount.minus(spent);
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    month: budget.month.toISOString().slice(0, 10),
    limitAmount: budget.limitAmount.toFixed(4),
    currency,
    spentAmount: spent.toFixed(4),
    remainingAmount: remaining.toFixed(4),
    progressPercent: spent
      .div(budget.limitAmount)
      .mul(100)
      .toDecimalPlaces(2)
      .toNumber(),
    isExceeded: spent.gt(budget.limitAmount),
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    userId: string,
    query: ListBudgetsQueryDto,
  ): Promise<BudgetListResponseDto> {
    const user = await this.getUser(userId);
    const month = query.month
      ? new Date(query.month + 'T00:00:00.000Z')
      : currentBudgetMonth(new Date(), user.timeZone);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.BudgetWhereInput = { userId, month };
    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: [{ categoryId: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.budget.count({ where }),
    ]);
    const grouped =
      budgets.length === 0
        ? []
        : await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: {
              userId,
              categoryId: { in: budgets.map((budget) => budget.categoryId) },
              type: TransactionType.EXPENSE,
              transactionDate: { gte: month, lt: nextBudgetMonth(month) },
            },
            _sum: { baseAmount: true },
          });
    const spentByCategory = new Map(
      grouped.map((item) => [
        item.categoryId,
        item._sum.baseAmount ?? new Prisma.Decimal(0),
      ]),
    );
    return {
      items: budgets.map((budget) =>
        toResponse(
          budget,
          user.baseCurrency,
          spentByCategory.get(budget.categoryId) ?? new Prisma.Decimal(0),
        ),
      ),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(userId: string, id: string): Promise<BudgetResponseDto> {
    const user = await this.getUser(userId);
    const budget = await this.getOwned(this.prisma, userId, id);
    const spent = await this.spent(this.prisma, userId, budget);
    return toResponse(budget, user.baseCurrency, spent);
  }

  async create(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const user = await this.getUser(userId);
    const limitAmount = new Prisma.Decimal(dto.limitAmount);
    if (!limitAmount.isFinite() || limitAmount.lte(0)) this.invalidLimit();
    const month = new Date(dto.month + 'T00:00:00.000Z');
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.assertExpenseCategory(transaction, userId, dto.categoryId);
        const budget = await transaction.budget.create({
          data: {
            userId,
            categoryId: dto.categoryId,
            month,
            limitAmount,
          },
        });
        await this.audit.record(transaction, {
          userId,
          entityType: AuditableEntityType.BUDGET,
          entityId: budget.id,
          action: AuditAction.CREATE,
          after: budgetAuditSnapshot(budget),
        });
        const spent = await this.spent(transaction, userId, budget);
        return toResponse(budget, user.baseCurrency, spent);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        this.budgetConflict();
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE',
        message: 'At least one budget field is required',
      });
    }
    const user = await this.getUser(userId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await this.getOwned(transaction, userId, id);
        const categoryId = dto.categoryId ?? current.categoryId;
        await this.assertExpenseCategory(transaction, userId, categoryId);
        const limitAmount = dto.limitAmount
          ? new Prisma.Decimal(dto.limitAmount)
          : current.limitAmount;
        if (!limitAmount.isFinite() || limitAmount.lte(0)) this.invalidLimit();
        const budget = await transaction.budget.update({
          where: { id, userId },
          data: {
            ...(dto.categoryId !== undefined ? { categoryId } : {}),
            ...(dto.month !== undefined
              ? { month: new Date(dto.month + 'T00:00:00.000Z') }
              : {}),
            ...(dto.limitAmount !== undefined ? { limitAmount } : {}),
          },
        });
        await this.audit.record(transaction, {
          userId,
          entityType: AuditableEntityType.BUDGET,
          entityId: id,
          action: AuditAction.UPDATE,
          before: budgetAuditSnapshot(current),
          after: budgetAuditSnapshot(budget),
        });
        const spent = await this.spent(transaction, userId, budget);
        return toResponse(budget, user.baseCurrency, spent);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        this.budgetConflict();
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        this.budgetNotFound();
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const current = await this.getOwned(transaction, userId, id);
        await transaction.budget.delete({ where: { id, userId } });
        await this.audit.record(transaction, {
          userId,
          entityType: AuditableEntityType.BUDGET,
          entityId: id,
          action: AuditAction.DELETE,
          before: budgetAuditSnapshot(current),
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        this.budgetNotFound();
      throw error;
    }
  }

  private async getOwned(
    transaction: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<Budget> {
    const budget = await transaction.budget.findFirst({
      where: { id, userId },
    });
    if (!budget) this.budgetNotFound();
    return budget;
  }

  private async assertExpenseCategory(
    transaction: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await transaction.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
    if (category.type !== TransactionType.EXPENSE) {
      throw new BadRequestException({
        code: 'BUDGET_CATEGORY_NOT_EXPENSE',
        message: 'Budget category must be an expense category',
      });
    }
  }

  private async spent(
    transaction: Prisma.TransactionClient,
    userId: string,
    budget: Budget,
  ): Promise<Prisma.Decimal> {
    const result = await transaction.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: TransactionType.EXPENSE,
        transactionDate: {
          gte: budget.month,
          lt: nextBudgetMonth(budget.month),
        },
      },
      _sum: { baseAmount: true },
    });
    return result._sum.baseAmount ?? new Prisma.Decimal(0);
  }

  private invalidSession(): never {
    throw new UnauthorizedException({
      code: 'INVALID_SESSION',
      message: 'Authentication is required',
    });
  }

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true, timeZone: true },
    });
    if (!user) this.invalidSession();
    return user;
  }

  private budgetNotFound(): never {
    throw new NotFoundException({
      code: 'BUDGET_NOT_FOUND',
      message: 'Budget not found',
    });
  }

  private invalidLimit(): never {
    throw new BadRequestException({
      code: 'INVALID_BUDGET_LIMIT',
      message: 'Budget limit must be positive',
    });
  }

  private budgetConflict(): never {
    throw new ConflictException({
      code: 'BUDGET_EXISTS',
      message: 'Budget already exists for this category and month',
    });
  }
}
