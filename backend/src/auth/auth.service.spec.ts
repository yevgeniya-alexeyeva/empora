import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'crypto';
import type { Transaction } from 'sequelize';
import { RefreshSession, User } from '../database/models';
import { AuthService } from './auth.service';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

function createRefreshHarness() {
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test',
    role: 'user',
  } as User;
  let sessionSequence = 1;
  let currentSession: RefreshSession | null;
  let failTokenIssue = false;
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
  } as unknown as Transaction;

  const makeSession = (id: string, tokenHash: string): RefreshSession => {
    const session = {
      id,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      save: jest.fn(() => Promise.resolve(session)),
      destroy: jest.fn(() => {
        if (currentSession?.id === id) currentSession = null;
        return Promise.resolve();
      }),
    } as unknown as RefreshSession;
    return session;
  };
  currentSession = makeSession('old-session', hashToken('old-refresh'));

  let transactionTail = Promise.resolve();
  const runTransaction = async <T>(
    callback: (transaction: Transaction) => Promise<T>,
  ): Promise<T> => {
    const previous = transactionTail;
    let release!: () => void;
    transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = currentSession;
    try {
      return await callback(transaction);
    } catch (error) {
      currentSession = snapshot;
      throw error;
    } finally {
      release();
    }
  };

  const users = {
    findByPk: jest.fn<() => Promise<User>>().mockResolvedValue(user),
  } as unknown as typeof User;
  const sessions = {
    sequelize: { transaction: runTransaction },
    destroy: jest.fn<() => Promise<number>>().mockResolvedValue(0),
    findByPk: jest.fn((id: string) =>
      Promise.resolve(currentSession?.id === id ? currentSession : null),
    ),
    create: jest.fn((values: { tokenHash: string }) => {
      const session = makeSession(
        `new-session-${sessionSequence++}`,
        values.tokenHash,
      );
      currentSession = session;
      return Promise.resolve(session);
    }),
  } as unknown as typeof RefreshSession;
  const jwt = {
    verifyAsync: jest.fn(() =>
      Promise.resolve({
        sub: user.id,
        sid: 'old-session',
        type: 'refresh',
      }),
    ),
    signAsync: jest.fn((payload: { type: string; sid?: string }) => {
      if (failTokenIssue) return Promise.reject(new Error('signing failed'));
      return Promise.resolve(
        payload.type === 'refresh'
          ? `new-refresh-${payload.sid}`
          : 'new-access',
      );
    }),
  } as unknown as JwtService;
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        accessTtl: '15m',
        refreshTtl: '7d',
      };
      return values[key] ?? fallback;
    }),
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  } as unknown as ConfigService;

  return {
    service: new AuthService(users, sessions, jwt, config),
    getCurrentSession: () => currentSession,
    setFailTokenIssue: (value: boolean) => {
      failTokenIssue = value;
    },
  };
}

describe('AuthService', () => {
  it('rejects a login for an unknown email', async () => {
    const users = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
    } as unknown as typeof User;
    const sessions = {
      destroy: jest.fn<() => Promise<number>>().mockResolvedValue(0),
    } as unknown as typeof RefreshSession;
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

  it('allows only one concurrent refresh to consume a session', async () => {
    const harness = createRefreshHarness();

    const results = await Promise.allSettled([
      harness.service.refresh('old-refresh'),
      harness.service.refresh('old-refresh'),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: expect.any(UnauthorizedException),
    });
    await expect(harness.service.refresh('old-refresh')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('restores the consumed session when token issue fails', async () => {
    const harness = createRefreshHarness();
    const oldSession = harness.getCurrentSession();
    harness.setFailTokenIssue(true);

    await expect(harness.service.refresh('old-refresh')).rejects.toThrow(
      'signing failed',
    );
    expect(harness.getCurrentSession()).toBe(oldSession);

    harness.setFailTokenIssue(false);
    await expect(harness.service.refresh('old-refresh')).resolves.toMatchObject(
      {
        accessToken: 'new-access',
      },
    );
  });
});
