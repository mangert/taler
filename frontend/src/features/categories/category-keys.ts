/** Хранит ключи кеша запросов для работы с категориями. */
import type { CategoryListParams } from '../../shared/api/categories';

export const categoryKeys = {
  /** Формирует корневой ключ кеша категорий. */
  all: (userId: string) => ['categories', userId] as const,
  /** Формирует ключ кеша списка категорий. */
  list: (userId: string, params: CategoryListParams) =>
    [
      ...categoryKeys.all(userId),
      'list',
      params.search,
      params.page,
      params.pageSize,
    ] as const,
};
