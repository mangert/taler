import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from './auth-cookie.service.js';
import type { AuthenticatedUser, JwtAccessTokenPayload } from './auth.types.js';

export type AuthenticatedRequest = Omit<Request, 'cookies'> & {
  cookies: Record<string, unknown>;
  user?: AuthenticatedUser;
};

function isAccessTokenPayload(value: unknown): value is JwtAccessTokenPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return typeof payload.sub === 'string' && typeof payload.email === 'string';
}

function invalidSession(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_SESSION',
    message: 'Authentication is required',
  });
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = request.cookies[ACCESS_TOKEN_COOKIE];

    if (typeof accessToken !== 'string' || accessToken === '') {
      throw invalidSession();
    }

    try {
      const payload: unknown = await this.jwtService.verifyAsync(accessToken);

      if (!isAccessTokenPayload(payload)) {
        throw invalidSession();
      }

      request.user = { id: payload.sub, email: payload.email };

      return true;
    } catch {
      throw invalidSession();
    }
  }
}
