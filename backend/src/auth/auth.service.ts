/** Реализует операции с аутентификацией. */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUserResponse, userProfileSelect } from '../users/user-profile.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

interface AuthResult {
  accessToken: string;
  user: UserResponseDto;
}

/** Распознаёт ошибку уникальности базы данных. */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/** Создаёт ответ о занятом адресе почты. */
function emailConflict(): ConflictException {
  return new ConflictException({
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'An account with this email already exists',
  });
}

/** Создаёт ответ о неверных учётных данных. */
function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
  });
}

@Injectable()
export class AuthService {
  /** Получает зависимости для работы класса. */
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** Регистрирует нового пользователя. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw emailConflict();
    }

    const passwordHash = await hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          baseCurrency: dto.baseCurrency,
          timeZone: dto.timeZone,
        },
        select: userProfileSelect,
      });
      const accessToken = await this.createAccessToken(user.id, user.email);

      return { accessToken, user: toUserResponse(user) };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw emailConflict();
      }

      throw error;
    }
  }

  /** Создаёт сессию пользователя. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        ...userProfileSelect,
        passwordHash: true,
      },
    });

    if (!user || !(await verify(user.passwordHash, dto.password))) {
      throw invalidCredentials();
    }

    return {
      accessToken: await this.createAccessToken(user.id, user.email),
      user: toUserResponse(user),
    };
  }

  /** Возвращает профиль текущего пользователя. */
  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Authentication is required',
      });
    }

    return toUserResponse(user);
  }

  /** Подписывает токен доступа пользователя. */
  private createAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, email });
  }
}
