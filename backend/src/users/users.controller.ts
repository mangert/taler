import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiCookieAuth('cookieAuth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({
    description: 'Updated public user profile',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Profile update validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Base currency cannot be changed after the first transaction',
    type: ApiErrorResponseDto,
  })
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(currentUser.id, body);
  }
}
