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
import { UniqueConstraintError } from 'sequelize';
import { RefreshSession, User } from '../database/models';
import { AuthUser } from './auth.types';
import { LoginDto, RegisterDto } from './auth.dto';

type RefreshPayload = { sub: string; sid: string; type: 'refresh' };
type Tokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

function ttlSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Unsupported JWT TTL: ${value}`);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * multipliers[match[2] as keyof typeof multipliers];
}

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
    try {
      const user = await this.users.create({
        email: dto.email.toLowerCase(),
        passwordHash: await hash(dto.password, 12),
        name: dto.name?.trim() ?? '',
      });
      
      return { user: publicUser(user), ...(await this.issueTokens(user)) };
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
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

    const session = await this.sessions.findByPk(payload.sid, {
      include: [User],
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== tokenHash(refreshToken)
    ) {
      throw new UnauthorizedException('Refresh session expired');
    }

    await session.destroy();

    return {
      user: publicUser(session.user),
      ...(await this.issueTokens(session.user)),
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
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

  private async issueTokens(user: User): Promise<Tokens> {
    const refreshTtl = ttlSeconds(this.config.get<string>('refreshTtl', '7d'));
    const session = await this.sessions.create({
      userId: user.id,
      tokenHash: 'pending',
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
    });
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, type: 'access' },
        {
          secret: this.config.getOrThrow<string>('accessSecret'),
          expiresIn: ttlSeconds(this.config.get<string>('accessTtl', '15m')),
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
    await session.save();
    return { accessToken, refreshToken, refreshExpiresAt: session.expiresAt };
  }
}
