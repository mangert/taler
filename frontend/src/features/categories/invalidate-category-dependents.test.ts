import { QueryClient } from '@tanstack/react-query';
import { invalidateCategoryDependents } from './invalidate-category-dependents';

it('invalidates only current-user categories and dependent summaries', async () => {
  const queryClient = new QueryClient();
  const affectedKeys = [
    ['categories', 'current', 'list'],
    ['dashboard', 'current', 'summary'],
    ['budgets', 'current', 'summary'],
  ];
  const unaffectedKeys = [
    ['categories', 'other', 'list'],
    ['dashboard', 'other', 'summary'],
    ['budgets', 'other', 'summary'],
    ['auth', 'me'],
    ['transactions', 'current', 'list'],
  ];
  for (const key of [...affectedKeys, ...unaffectedKeys]) {
    queryClient.setQueryData(key, { value: true });
  }

  await invalidateCategoryDependents(queryClient, 'current');

  for (const key of affectedKeys) {
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  }
  for (const key of unaffectedKeys) {
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  }
});
