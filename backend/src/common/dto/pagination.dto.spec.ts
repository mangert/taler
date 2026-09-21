import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SortDirection } from '../enums/sort-direction.enum.js';
import { PaginatedMetaDto } from './paginated-meta.dto.js';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('pagination DTOs', () => {
  it('applies defaults and transforms positive integer query values', async () => {
    const defaults = plainToInstance(PaginationQueryDto, {});
    const requested = plainToInstance(PaginationQueryDto, {
      page: '3',
      pageSize: '50',
    });

    await expect(validate(defaults)).resolves.toHaveLength(0);
    await expect(validate(requested)).resolves.toHaveLength(0);
    expect(defaults).toEqual({ page: 1, pageSize: 20 });
    expect(requested).toEqual({ page: 3, pageSize: 50 });
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ pageSize: '0' }, 'pageSize'],
    [{ pageSize: '101' }, 'pageSize'],
  ])('rejects invalid pagination query %#', async (query, property) => {
    const dto = plainToInstance(PaginationQueryDto, query);
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain(property);
  });

  it('constructs response metadata and exposes stable sort values', () => {
    expect(
      new PaginatedMetaDto({
        page: 2,
        pageSize: 20,
        total: 45,
        totalPages: 3,
      }),
    ).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
    expect(Object.values(SortDirection)).toEqual(['asc', 'desc']);
  });
});
