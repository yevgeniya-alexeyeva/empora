import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/sequelize';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { User } from '../database/models';
import { UpdateProfileDto } from './users.dto';

@ApiTags('users')
@ApiCookieAuth('empora_access')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@InjectModel(User) private readonly users: typeof User) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() current: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.users.findByPk(current.id);
    if (!user) throw new NotFoundException('User not found');

    user.name = dto.name;
    await user.save();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
