import { jest } from '@jest/globals';

import { Prisma } from '../../generated/prisma/client.js';
import {
  serializeDecimal,
  serializeIsoDate,
  serializeIsoDateTime,
} from './serialization.js';
import { findOwnedOrThrow, OwnershipWhere } from './ownership.js';
import { createPagination } from './pagination.js';

describe('common API helpers', () => {
  it('serializes Decimal and dates without losing precision or timezone', () => {
    expect(
      serializeDecimal(new Prisma.Decimal('900719925474099.1234'), 4),
    ).toBe('900719925474099.1234');
    expect(serializeDecimal(new Prisma.Decimal('1.2'), 8)).toBe('1.20000000');

    const instant = new Date('2026-09-19T21:15:30.456Z');

    expect(serializeIsoDate(instant)).toBe('2026-09-19');
    expect(serializeIsoDateTime(instant)).toBe('2026-09-19T21:15:30.456Z');
  });

  it('passes both identifiers to an ownership lookup and masks a miss', async () => {
    const where = {
      id: '10000000-0000-4000-8000-000000000001',
      userId: '20000000-0000-4000-8000-000000000001',
    };
    const found = { id: where.id, label: 'owned' };
    const lookup = jest
      .fn<(ownership: OwnershipWhere) => Promise<typeof found | null>>()
      .mockResolvedValueOnce(found)
      .mockResolvedValueOnce(null);

    await expect(findOwnedOrThrow(lookup, where, 'Transaction')).resolves.toBe(
      found,
    );
    await expect(
      findOwnedOrThrow(lookup, where, 'Transaction'),
    ).rejects.toMatchObject({
      status: 404,
      response: {
        message: 'Transaction not found',
      },
    });
    expect(lookup).toHaveBeenNthCalledWith(1, where);
    expect(lookup).toHaveBeenNthCalledWith(2, where);
  });

  it('calculates Prisma pagination arguments and response metadata', () => {
    expect(createPagination(3, 20, 45)).toEqual({
      skip: 40,
      take: 20,
      meta: {
        page: 3,
        pageSize: 20,
        total: 45,
        totalPages: 3,
      },
    });
    expect(createPagination(1, 20, 0).meta.totalPages).toBe(0);
  });

  it('rejects pagination values outside the centralized limits', () => {
    expect(() => createPagination(0, 20, 0)).toThrow(
      'page must be a positive integer',
    );
    expect(() => createPagination(1, 101, 0)).toThrow(
      'pageSize must be an integer between 1 and 100',
    );
  });
});
