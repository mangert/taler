export interface RecurringOccurrence {
  scheduledDate: string;
  nextRunAt: Date;
}

export function localDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year').padStart(4, '0')}-${value('month')}-${value('day')}`;
}

function zonedStartOfDay(date: string, timeZone: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00.000Z`).getTime();
  let lower = utcMidnight - 36 * 60 * 60 * 1000;
  let upper = utcMidnight + 36 * 60 * 60 * 1000;

  // A local calendar date is monotonic in UTC even across DST transitions.
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (localDate(new Date(middle), timeZone) < date) lower = middle + 1;
    else upper = middle;
  }
  if (localDate(new Date(lower), timeZone) !== date) {
    throw new RangeError(`Local date ${date} does not exist in ${timeZone}`);
  }
  return new Date(lower);
}

export function nextOccurrence(
  fromDate: string,
  dayOfMonth: number,
  timeZone: string,
): RecurringOccurrence {
  const firstOfMonth = new Date(`${fromDate.slice(0, 7)}-01T00:00:00.000Z`);
  for (let offset = 0; offset < 2; offset += 1) {
    const first = new Date(firstOfMonth);
    first.setUTCMonth(first.getUTCMonth() + offset);
    const last = new Date(first);
    last.setUTCMonth(last.getUTCMonth() + 1);
    last.setUTCDate(0);
    const lastDay = last.getUTCDate();
    const scheduledDate = `${first.toISOString().slice(0, 7)}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`;
    if (scheduledDate >= fromDate) {
      return {
        scheduledDate,
        nextRunAt: zonedStartOfDay(scheduledDate, timeZone),
      };
    }
  }
  throw new RangeError('Unable to find the next monthly occurrence');
}

export function followingOccurrence(
  scheduledDate: string,
  dayOfMonth: number,
  timeZone: string,
): RecurringOccurrence {
  const nextMonth = new Date(`${scheduledDate.slice(0, 7)}-01T00:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return nextOccurrence(
    nextMonth.toISOString().slice(0, 10),
    dayOfMonth,
    timeZone,
  );
}
