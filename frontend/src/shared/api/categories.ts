import type { components } from './schema';
import { apiRequest } from './http';

export type Category = components['schemas']['CategoryResponseDto'];
export type CategoryList = components['schemas']['CategoryListResponseDto'];
export type CreateCategoryInput = components['schemas']['CreateCategoryDto'];
export type UpdateCategoryInput = components['schemas']['UpdateCategoryDto'];

export interface CategoryListParams {
  search: string;
  page: number;
  pageSize: number;
}

function categoryUrl(id: string): string {
  return `/api/v1/categories/${encodeURIComponent(id)}`;
}

export const categoriesApi = {
  list: (params: CategoryListParams): Promise<CategoryList> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.search) query.set('search', params.search);
    return apiRequest<CategoryList>(`/api/v1/categories?${query.toString()}`);
  },
  create: (input: CreateCategoryInput): Promise<Category> =>
    apiRequest<Category>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCategoryInput): Promise<Category> =>
    apiRequest<Category>(categoryUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string): Promise<void> =>
    apiRequest<void>(categoryUrl(id), { method: 'DELETE' }),
};
