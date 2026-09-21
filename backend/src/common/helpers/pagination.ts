import { MAX_PAGE_SIZE } from '../constants/pagination.constants.js';
import { PaginatedMetaDto } from '../dto/paginated-meta.dto.js';

export type PaginatedMeta = PaginatedMetaDto;

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
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('page must be a positive integer');
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new RangeError(
      `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`,
    );
  }

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    meta: new PaginatedMetaDto({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    }),
  };
}
