import type { CategoryListParams } from '../../shared/api/categories';

export const categoryKeys = {
  all: (userId: string) => ['categories', userId] as const,
  list: (userId: string, params: CategoryListParams) =>
    [
      ...categoryKeys.all(userId),
      'list',
      params.search,
      params.page,
      params.pageSize,
    ] as const,
};
