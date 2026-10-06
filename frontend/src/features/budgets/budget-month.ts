const monthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;

export function currentBudgetMonth(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}-01`;
}

export function selectedBudgetMonth(
  value: string | null,
  timeZone: string,
): string {
  return value && monthPattern.test(value)
    ? value
    : currentBudgetMonth(timeZone);
}

export function shiftBudgetMonth(month: string, offset: number): string {
  const date = new Date(`${month}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7) + '-01';
}

export function budgetMonthLabel(month: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}T00:00:00.000Z`));
}
