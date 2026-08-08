import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, jest } from '@jest/globals';
import { RefreshSession, User } from '../database/models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('rejects a login for an unknown email', async () => {
    const users = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
    } as unknown as typeof User;
    const sessions = {} as typeof RefreshSession;
    const service = new AuthService(
      users,
      sessions,
      {} as JwtService,
      {} as ConfigService,
    );

    await expect(
      service.login({ email: 'missing@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
