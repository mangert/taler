import type { TransactionType } from '../../shared/api/transactions';

const locale = 'ru-RU';
const calendarDateFormatter = new Intl.DateTimeFormat(locale, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatTransactionDate(date: string): string {
  // transactionDate is a calendar date, not a timestamp in the browser's zone.
  return calendarDateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}

export function formatTransactionAmount(
  amount: string,
  currency: string,
  type: TransactionType,
): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) return `${type === 'INCOME' ? '+' : '−'}${amount} ${currency}`;

  // BigInt keeps the integer exact even for values above Number.MAX_SAFE_INTEGER.
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  const minimumFractionDigits =
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).resolvedOptions().minimumFractionDigits ?? 0;
  const fraction = (match[2] ?? '')
    .replace(/0+$/, '')
    .padEnd(minimumFractionDigits, '0');
  const parts = formatter.formatToParts(BigInt(match[1]));

  if (fraction) {
    const decimal = new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value;
    const lastIntegerPart = parts.findLastIndex(
      (part) => part.type === 'integer' || part.type === 'group',
    );
    parts.splice(
      lastIntegerPart + 1,
      0,
      { type: 'decimal', value: decimal ?? ',' },
      { type: 'fraction', value: fraction },
    );
  }

  return `${type === 'INCOME' ? '+' : '−'}${parts.map((part) => part.value).join('')}`;
}
