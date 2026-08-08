import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import {
  Answer,
  Question,
  QuestionOption,
  Survey,
  SurveyResponse,
  User,
} from '../database/models';
import {
  AdminSurveysController,
  SurveysController,
} from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Survey,
      Question,
      QuestionOption,
      SurveyResponse,
      Answer,
      User,
    ]),
    AuthModule,
  ],
  controllers: [SurveysController, AdminSurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
