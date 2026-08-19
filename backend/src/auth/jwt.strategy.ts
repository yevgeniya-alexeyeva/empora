import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../database/models';
import { AuthUser } from './auth.types';

type AccessPayload = { sub: string; type: 'access' };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User) private readonly users: typeof User,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.empora_access as string | null,
      ]),
      secretOrKey: config.getOrThrow<string>('accessSecret'),
    });
  }

  async validate(payload: AccessPayload): Promise<AuthUser> {
    if (payload.type !== 'access') throw new UnauthorizedException();

    const user = await this.users.findByPk(payload.sub);

    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
