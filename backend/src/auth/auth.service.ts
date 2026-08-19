import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { compare, hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import { RefreshSession, User } from '../database/models';
import { AuthUser } from './auth.types';
import { LoginDto, RegisterDto } from './auth.dto';
import { parseTtlSeconds } from './ttl';

type RefreshPayload = { sub: string; sid: string; type: 'refresh' };
type Tokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const publicUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly users: typeof User,
    @InjectModel(RefreshSession)
    private readonly sessions: typeof RefreshSession,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, 12);
    await this.cleanupExpiredSessions();
    try {
      return await this.users.sequelize!.transaction(async (transaction) => {
        const user = await this.users.create(
          {
            email: dto.email.toLowerCase(),
            passwordHash,
            name: dto.name?.trim() ?? '',
          },
          { transaction },
        );

        return {
          user: publicUser(user),
          ...(await this.issueTokens(user, transaction)),
        };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    await this.cleanupExpiredSessions();
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { user: publicUser(user), ...(await this.issueTokens(user)) };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException();
    await this.cleanupExpiredSessions();

    return this.sessions.sequelize!.transaction(async (transaction) => {
      const session = await this.sessions.findByPk(payload.sid, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.expiresAt <= new Date() ||
        session.tokenHash !== tokenHash(refreshToken)
      ) {
        throw new UnauthorizedException('Refresh session expired');
      }

      const user = await this.users.findByPk(session.userId, { transaction });
      if (!user) throw new UnauthorizedException('Refresh session expired');

      await session.destroy({ transaction });

      return {
        user: publicUser(user),
        ...(await this.issueTokens(user, transaction)),
      };
    });
  }

  async logout(refreshToken?: string) {
    try {
      await this.cleanupExpiredSessions();
      if (!refreshToken) return;
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('refreshSecret'),
      });
      const session = await this.sessions.findByPk(payload.sid);
      if (session?.tokenHash === tokenHash(refreshToken)) {
        await session.destroy();
      }
    } catch {
      return;
    }
  }

  private async cleanupExpiredSessions() {
    try {
      await this.sessions.destroy({
        where: { expiresAt: { [Op.lte]: new Date() } },
      });
    } catch {
      return;
    }
  }

  private async issueTokens(
    user: User,
    transaction?: Transaction,
  ): Promise<Tokens> {
    const refreshTtl = parseTtlSeconds(
      this.config.get<string>('refreshTtl', '7d'),
    );
    const session = await this.sessions.create(
      {
        userId: user.id,
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
      { transaction },
    );
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, type: 'access' },
        {
          secret: this.config.getOrThrow<string>('accessSecret'),
          expiresIn: parseTtlSeconds(
            this.config.get<string>('accessTtl', '15m'),
          ),
        },
      ),
      this.jwt.signAsync(
        { sub: user.id, sid: session.id, type: 'refresh' },
        {
          secret: this.config.getOrThrow<string>('refreshSecret'),
          expiresIn: refreshTtl,
        },
      ),
    ]);
    session.tokenHash = tokenHash(refreshToken);
    await session.save({ transaction });
    return { accessToken, refreshToken, refreshExpiresAt: session.expiresAt };
  }
}
