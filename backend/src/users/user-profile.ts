import { Prisma } from '../generated/prisma/client.js';
import { serializeIsoDateTime } from '../common/helpers/serialization.js';
import { UserResponseDto } from './dto/user-response.dto.js';

export const userProfileSelect = {
  id: true,
  email: true,
  displayName: true,
  baseCurrency: true,
  timeZone: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserProfileRecord = Prisma.UserGetPayload<{
  select: typeof userProfileSelect;
}>;

export function toUserResponse(user: UserProfileRecord): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    baseCurrency: user.baseCurrency,
    timeZone: user.timeZone,
    createdAt: serializeIsoDateTime(user.createdAt),
    updatedAt: serializeIsoDateTime(user.updatedAt),
  };
}
