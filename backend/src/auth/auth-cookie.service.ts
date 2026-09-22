import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { jwtDurationToSeconds } from './jwt-duration.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';

@Injectable()
export class AuthCookieService {
  private readonly cookieOptions: CookieOptions;
  private readonly clearCookieOptions: CookieOptions;

  constructor(config: ConfigService) {
    const expiresInSeconds = jwtDurationToSeconds(
      config.getOrThrow<string>('JWT_EXPIRES_IN'),
    );

    this.clearCookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    this.cookieOptions = {
      ...this.clearCookieOptions,
      maxAge: expiresInSeconds * 1_000,
    };
  }

  set(response: Response, accessToken: string): void {
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, this.cookieOptions);
  }

  clear(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, this.clearCookieOptions);
  }
}
