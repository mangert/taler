import type { Dashboard } from '../../shared/api/dashboard';
import {
  formatDashboardAmount,
  toDashboardViewModel,
} from './dashboard-view-model';

it('maps decimal API values to chart coordinates while preserving exact display values', () => {
  const dashboard: Dashboard = {
    currency: 'RUB',
    months: 1,
    fromMonth: '2026-09-01',
    toMonth: '2026-09-01',
    totals: { income: '100.0000', expense: '12.3456', balance: '87.6544' },
    expensesByCategory: [
      {
        categoryId: 'a',
        categoryName: 'Продукты',
        color: '#EF6C00',
        amount: '12.3456',
      },
    ],
    monthlySeries: [
      { month: '2026-09-01', income: '100.0000', expense: '12.3456' },
    ],
    topCategories: [
      {
        categoryId: 'a',
        categoryName: 'Продукты',
        color: '#EF6C00',
        amount: '12.3456',
      },
    ],
  };

  const view = toDashboardViewModel(dashboard);

  expect(view.categories[0]).toMatchObject({
    id: 'a',
    value: 12.3456,
    amount: '12.3456',
  });
  expect(view.monthly[0]).toMatchObject({
    month: '2026-09-01',
    income: 100,
    expense: 12.3456,
  });
  expect(view.topCategories[0].name).toBe('Продукты');
  expect(formatDashboardAmount('9007199254740993.0000', 'RUB')).toContain(
    '9 007 199 254 740 993',
  );
});
