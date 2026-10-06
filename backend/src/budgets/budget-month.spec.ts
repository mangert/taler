import { currentBudgetMonth, nextBudgetMonth } from './budget-month.js';

describe('budget months', () => {
  it('uses the user time zone to select the current calendar month', () => {
    const instant = new Date('2026-09-30T12:00:00.000Z');
    expect(
      currentBudgetMonth(instant, 'Pacific/Kiritimati').toISOString(),
    ).toBe('2026-10-01T00:00:00.000Z');
    expect(currentBudgetMonth(instant, 'Pacific/Honolulu').toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('rolls December over to January without shifting date-only boundaries', () => {
    expect(
      nextBudgetMonth(new Date('2026-12-01T00:00:00.000Z')).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z');
  });
});
