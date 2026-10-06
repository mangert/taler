import {
  currentBudgetMonth,
  selectedBudgetMonth,
  shiftBudgetMonth,
} from './budget-month';

it('uses the profile timezone when choosing the current budget month', () => {
  const now = new Date('2026-09-30T12:30:00.000Z');
  expect(currentBudgetMonth('Pacific/Kiritimati', now)).toBe('2026-10-01');
  expect(currentBudgetMonth('Pacific/Honolulu', now)).toBe('2026-09-01');
});

it('keeps URL months canonical and rolls across year boundaries', () => {
  expect(selectedBudgetMonth('2026-13-01', 'UTC')).not.toBe('2026-13-01');
  expect(selectedBudgetMonth('2026-09-01', 'UTC')).toBe('2026-09-01');
  expect(shiftBudgetMonth('2026-12-01', 1)).toBe('2027-01-01');
  expect(shiftBudgetMonth('2026-01-01', -1)).toBe('2025-12-01');
});
