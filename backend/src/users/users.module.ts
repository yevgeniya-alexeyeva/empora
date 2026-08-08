import {
  Body,
  Controller,
  Get,
  Module,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { InjectModel, SequelizeModule } from '@nestjs/sequelize';
import { IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/auth.guards';
import { User } from '../database/models';

class UpdateProfileDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;
}

@ApiTags('users')
@ApiCookieAuth('empora_access')
@UseGuards(JwtAuthGuard)
@Controller('users')
class UsersController {
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
    const user = await this.users.findByPk(current.id, { rejectOnEmpty: true });
    user.name = dto.name.trim();
    await user.save();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}

@Module({
  imports: [SequelizeModule.forFeature([User])],
  controllers: [UsersController],
})
export class UsersModule {}
