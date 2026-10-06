import { QueryClient } from '@tanstack/react-query';
import { invalidateBudgetDependents } from './invalidate-budget-dependents';

it('invalidates only current-user budgets, dashboard and audit after a budget mutation', async () => {
  const queryClient = new QueryClient();
  const affected = [
    ['budgets', 'current', 'list'],
    ['dashboard', 'current', 'summary'],
    ['audit', 'current', 'list'],
  ];
  const unaffected = [
    ['budgets', 'other', 'list'],
    ['dashboard', 'other', 'summary'],
    ['audit', 'other', 'list'],
    ['categories', 'current', 'list'],
  ];
  for (const key of [...affected, ...unaffected])
    queryClient.setQueryData(key, { value: true });

  await invalidateBudgetDependents(queryClient, 'current');

  for (const key of affected)
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of unaffected)
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
});
