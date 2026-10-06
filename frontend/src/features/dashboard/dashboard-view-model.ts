import type { Dashboard } from '../../shared/api/dashboard';

export interface CategoryChartPoint {
  id: string;
  name: string;
  color: string;
  value: number;
  amount: string;
}

export interface MonthlyChartPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
}

export interface DashboardViewModel {
  categories: CategoryChartPoint[];
  monthly: MonthlyChartPoint[];
  topCategories: CategoryChartPoint[];
}

export function formatDashboardAmount(
  amount: string,
  currency: string,
): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) return `${amount} ${currency}`;
  const integer = new Intl.NumberFormat('ru-RU').format(BigInt(match[2]));
  const fraction = (match[3] ?? '').replace(/0+$/, '').padEnd(2, '0');
  return `${match[1] === '-' ? '−' : ''}${integer},${fraction} ${currency}`;
}

export function formatDashboardMonth(month: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}T00:00:00.000Z`));
}

export function toDashboardViewModel(data: Dashboard): DashboardViewModel {
  const categoryPoint = (
    category: Dashboard['expensesByCategory'][number],
  ): CategoryChartPoint => ({
    id: category.categoryId,
    name: category.categoryName,
    color: category.color,
    value: Number(category.amount),
    amount: category.amount,
  });

  return {
    categories: data.expensesByCategory.map(categoryPoint),
    monthly: data.monthlySeries.map((item) => ({
      month: item.month,
      label: formatDashboardMonth(item.month),
      income: Number(item.income),
      expense: Number(item.expense),
    })),
    topCategories: data.topCategories.map(categoryPoint),
  };
}
