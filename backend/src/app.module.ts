import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { configuration, validateEnvironment } from './config/configuration';
import { models } from './database/models';
import { SurveysModule } from './surveys/surveys.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        uri: config.getOrThrow<string>('databaseUrl'),
        models,
        autoLoadModels: false,
        synchronize: false,
        logging: false,
      }),
    }),
    AuthModule,
    UsersModule,
    SurveysModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
