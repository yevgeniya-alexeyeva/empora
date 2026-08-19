import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';
import { AUTH_RATE_LIMITS, AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  it.each([
    ['register', AUTH_RATE_LIMITS.register],
    ['login', AUTH_RATE_LIMITS.login],
    ['refresh', AUTH_RATE_LIMITS.refresh],
  ] as const)('sets a strict local throttle for %s', (method, limit) => {
    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      method,
    )?.value as object;

    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(
      limit.limit,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
      limit.ttl,
    );
  });

  it('uses the configured access TTL for the access cookie', async () => {
    const result = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user' as const,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshExpiresAt: new Date(Date.now() + 86_400_000),
    };
    const auth = {
      login: jest.fn<() => Promise<typeof result>>().mockResolvedValue(result),
    } as unknown as AuthService;
    const config = {
      get: jest.fn((key: string, fallback?: string | boolean) => {
        if (key === 'accessTtl') return '2h';
        if (key === 'cookieSecure') return false;
        return fallback;
      }),
    } as unknown as ConfigService;
    const cookie = jest.fn();
    const response = {
      cookie,
    } as unknown as Response;
    const controller = new AuthController(auth, config);

    await controller.login(
      { email: 'test@example.com', password: 'Password123!' },
      response,
    );

    expect(cookie).toHaveBeenCalledWith(
      'empora_access',
      'access-token',
      expect.objectContaining({ maxAge: 2 * 60 * 60 * 1000 }),
    );
  });
});
