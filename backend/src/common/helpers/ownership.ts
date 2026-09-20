import { NotFoundException } from '@nestjs/common';

export interface OwnershipWhere {
  id: string;
  userId: string;
}

export async function findOwnedOrThrow<T>(
  lookup: (where: OwnershipWhere) => Promise<T | null>,
  where: OwnershipWhere,
  resourceName: string,
): Promise<T> {
  const entity = await lookup(where);

  if (entity === null) {
    throw new NotFoundException(`${resourceName} not found`);
  }

  return entity;
}
