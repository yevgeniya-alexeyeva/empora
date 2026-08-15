import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { CurrentUser, Roles } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../database/models';
import {
  CreateSurveyDto,
  PublishSurveyDto,
  ReplaceSurveyQuestionsDto,
  SubmitSurveyDto,
  UpdateSurveyDto,
} from './surveys.dto';
import { SurveysService } from './surveys.service';

@ApiTags('surveys')
@ApiCookieAuth('empora_access')
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Get()
  list() {
    return this.surveys.listPublished();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.getPublished(id);
  }

  @Post(':id/responses')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitSurveyDto,
  ) {
    return this.surveys.submit(id, user.id, dto);
  }
}

@ApiTags('admin surveys')
@ApiCookieAuth('empora_access')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/surveys')
export class AdminSurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Get()
  list() {
    return this.surveys.listAdmin();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.getSurveyDetails(id);
  }

  @Post()
  create(@Body() dto: CreateSurveyDto) {
    return this.surveys.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSurveyDto) {
    return this.surveys.update(id, dto);
  }

  @Put(':id/questions')
  replaceQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceSurveyQuestionsDto,
  ) {
    return this.surveys.replaceQuestions(id, dto.questions);
  }

  @Patch(':id/publication')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishSurveyDto,
  ) {
    return this.surveys.publish(id, dto.isPublished);
  }

  @Get(':id/results')
  results(@Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.results(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.surveys.remove(id);
  }
}
