import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { toUserResponse, userProfileSelect } from './user-profile.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!existingUser) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Authentication is required',
      });
    }

    if (
      dto.baseCurrency !== undefined &&
      dto.baseCurrency !== existingUser.baseCurrency
    ) {
      const transactionCount = await this.prisma.transaction.count({
        where: { userId },
      });

      if (transactionCount > 0) {
        throw new ConflictException({
          code: 'BASE_CURRENCY_LOCKED',
          message:
            'Base currency cannot be changed after the first transaction',
        });
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
    }

    if (dto.timeZone !== undefined) {
      data.timeZone = dto.timeZone;
    }

    if (dto.baseCurrency !== undefined) {
      data.baseCurrency = dto.baseCurrency;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE',
        message: 'At least one profile field is required',
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: userProfileSelect,
    });

    return toUserResponse(updatedUser);
  }
}
