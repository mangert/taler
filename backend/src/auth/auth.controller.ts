import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a user and start a session' })
  @ApiCreatedResponse({
    description: 'User registered and session cookie issued',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Registration validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'An account with this email already exists',
    type: ApiErrorResponseDto,
  })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const result = await this.authService.register(body);

    this.authCookieService.set(response, result.accessToken);

    return result.user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and start a session' })
  @ApiOkResponse({
    description: 'Credentials accepted and session cookie issued',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Login validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
    type: ApiErrorResponseDto,
  })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const result = await this.authService.login(body);

    this.authCookieService.set(response, result.accessToken);

    return result.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('cookieAuth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the current session cookie' })
  @ApiNoContentResponse({ description: 'Session cookie cleared' })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required',
    type: ApiErrorResponseDto,
  })
  logout(@Res({ passthrough: true }) response: Response): void {
    this.authCookieService.clear(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('cookieAuth')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({
    description: 'Current public user profile',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required',
    type: ApiErrorResponseDto,
  })
  getCurrentUser(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(currentUser.id);
  }
}
