export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Pagination {
  skip: number;
  take: number;
  meta: PaginatedMeta;
}

export function createPagination(
  page: number,
  pageSize: number,
  total: number,
): Pagination {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
