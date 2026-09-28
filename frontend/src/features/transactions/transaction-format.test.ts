import {
  formatTransactionAmount,
  formatTransactionDate,
} from './transaction-format';

it('formats four decimal places and large amounts without floating-point loss', () => {
  expect(
    formatTransactionAmount('9007199254740993.0001', 'USD', 'INCOME'),
  ).toBe('+9 007 199 254 740 993,0001 $');
});

it('keeps a calendar date on the same day when formatting in UTC', () => {
  expect(formatTransactionDate('2026-01-01')).toBe('01.01.2026');
});
