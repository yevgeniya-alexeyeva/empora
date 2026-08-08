import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { JwtAuthGuard } from './auth.guards';
import { CurrentUser } from './auth.types';
import type { AuthUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ description: 'User created and cookies set' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookies(response, result);
    return result.user;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Authenticated and cookies set' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookies(response, result);
    return result.user;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.empora_refresh as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh cookie is missing');
    const result = await this.auth.refresh(token);
    this.setCookies(response, result);
    return result.user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res() response: Response) {
    await this.auth.logout(
      request.cookies?.empora_refresh as string | undefined,
    );
    response.clearCookie('empora_access', { path: '/' });
    response.clearCookie('empora_refresh', { path: '/api/auth' });
    response.status(204).send();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('empora_access')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  private setCookies(
    response: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: Date;
    },
  ) {
    const secure = this.config.get<boolean>('cookieSecure', false);
    response.cookie('empora_access', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('empora_refresh', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth',
      expires: tokens.refreshExpiresAt,
    });
  }
}
