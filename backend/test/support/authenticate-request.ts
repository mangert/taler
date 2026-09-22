import { JwtService } from '@nestjs/jwt';
import type { Test } from 'supertest';
import type { TestUserFixture } from './factories.js';

export interface TestJwtPayload {
  sub: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is required for authenticated test requests');
  }

  return secret;
}

export function createTestAccessToken(user: TestUserFixture): string {
  const jwtService = new JwtService({
    secret: getJwtSecret(),
    signOptions: { expiresIn: '15m' },
  });
  const payload: TestJwtPayload = {
    sub: user.id,
    email: user.email,
  };

  return jwtService.sign(payload);
}

export function authenticateRequest(
  testRequest: Test,
  user: TestUserFixture,
): Test {
  const accessToken = createTestAccessToken(user);

  return testRequest.set('Cookie', `access_token=${accessToken}`);
}
