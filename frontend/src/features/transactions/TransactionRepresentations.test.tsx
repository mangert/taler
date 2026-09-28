import { render, screen, within } from '@testing-library/react';
import type { Transaction } from '../../shared/api/transactions';
import { TransactionCardList } from './TransactionCardList';
import { TransactionsTable } from './TransactionsTable';

const expense = {
  id: 'expense',
  categoryId: 'groceries',
  type: 'EXPENSE',
  amount: '125.5000',
  currency: 'RUB',
  exchangeRateToBase: '1.00000000',
  baseAmount: '125.5000',
  transactionDate: '2026-09-21',
  description: 'Покупка',
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
} satisfies Transaction;

const income = {
  ...expense,
  id: 'income',
  type: 'INCOME',
  amount: '2000.0000',
  description: 'Зарплата',
} satisfies Transaction;

it('shows signed localized money, calendar dates, and accessible type icons in both views', () => {
  const props = {
    transactions: [expense, income],
    categoryNames: new Map([['groceries', 'Продукты']]),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  render(
    <>
      <TransactionsTable {...props} />
      <TransactionCardList {...props} />
    </>,
  );

  for (const view of [
    screen.getByRole('table', { name: 'Транзакции' }),
    screen.getByRole('list', { name: 'Карточки транзакций' }),
  ]) {
    expect(within(view).getByText(/^−125,50\s*₽$/)).toBeInTheDocument();
    expect(within(view).getByText(/^\+2\s000,00\s*₽$/)).toBeInTheDocument();
    expect(within(view).getAllByText('21.09.2026')).toHaveLength(2);
    expect(
      within(view).getByRole('img', { name: 'Расход' }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole('img', { name: 'Доход' }),
    ).toBeInTheDocument();
  }
});
