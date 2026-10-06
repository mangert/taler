import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  currentBudgetMonth,
  nextBudgetMonth,
} from '../budgets/budget-month.js';
import { Prisma, TransactionType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardClock } from './dashboard.clock.js';
import type {
  DashboardCategoryDto,
  DashboardResponseDto,
} from './dto/dashboard-response.dto.js';

interface MonthlyAmounts {
  month: string;
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
}

function zeroAmount(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function monthString(month: Date): string {
  return month.toISOString().slice(0, 10);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: DashboardClock,
  ) {}

  async get(userId: string, months: number): Promise<DashboardResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true, timeZone: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Authentication is required',
      });
    }

    const currentMonth = currentBudgetMonth(this.clock.now(), user.timeZone);
    const firstMonth = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - months + 1,
        1,
      ),
    );
    const monthlyAmounts: MonthlyAmounts[] = Array.from(
      { length: months },
      (_, index) => ({
        month: monthString(
          new Date(
            Date.UTC(
              firstMonth.getUTCFullYear(),
              firstMonth.getUTCMonth() + index,
              1,
            ),
          ),
        ),
        income: zeroAmount(),
        expense: zeroAmount(),
      }),
    );
    const monthsByKey = new Map(
      monthlyAmounts.map((item) => [item.month, item]),
    );
    const grouped = await this.prisma.transaction.groupBy({
      by: ['transactionDate', 'type', 'categoryId'],
      where: {
        userId,
        transactionDate: { gte: firstMonth, lt: nextBudgetMonth(currentMonth) },
      },
      _sum: { baseAmount: true },
    });
    const categoryAmounts = new Map<string, Prisma.Decimal>();
    let income = zeroAmount();
    let expense = zeroAmount();

    for (const group of grouped) {
      const amount = group._sum.baseAmount ?? zeroAmount();
      const month = monthString(
        new Date(
          Date.UTC(
            group.transactionDate.getUTCFullYear(),
            group.transactionDate.getUTCMonth(),
            1,
          ),
        ),
      );
      const monthly = monthsByKey.get(month);
      if (!monthly) continue;
      if (group.type === TransactionType.INCOME) {
        monthly.income = monthly.income.plus(amount);
        income = income.plus(amount);
      } else {
        monthly.expense = monthly.expense.plus(amount);
        expense = expense.plus(amount);
        categoryAmounts.set(
          group.categoryId,
          (categoryAmounts.get(group.categoryId) ?? zeroAmount()).plus(amount),
        );
      }
    }

    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: [...categoryAmounts.keys()] } },
      select: { id: true, name: true, color: true },
    });
    const expensesByCategory: DashboardCategoryDto[] = categories
      .map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        color: category.color,
        amount: categoryAmounts.get(category.id) ?? zeroAmount(),
      }))
      .sort(
        (left, right) =>
          right.amount.comparedTo(left.amount) ||
          compareText(left.categoryName, right.categoryName) ||
          compareText(left.categoryId, right.categoryId),
      )
      .map((category) => ({
        ...category,
        amount: category.amount.toFixed(4),
      }));

    return {
      currency: user.baseCurrency,
      months,
      fromMonth: monthString(firstMonth),
      toMonth: monthString(currentMonth),
      totals: {
        income: income.toFixed(4),
        expense: expense.toFixed(4),
        balance: income.minus(expense).toFixed(4),
      },
      expensesByCategory,
      monthlySeries: monthlyAmounts.map((item) => ({
        month: item.month,
        income: item.income.toFixed(4),
        expense: item.expense.toFixed(4),
      })),
      topCategories: expensesByCategory.slice(0, 5),
    };
  }
}
