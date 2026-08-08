import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const origin = request.get('origin');
    const apiOrigin = `${request.protocol}://${request.get('host')}`;
    const frontendOrigin = config.getOrThrow<string>('frontendOrigin');
    if (
      unsafeMethod &&
      origin &&
      origin !== frontendOrigin &&
      origin !== apiOrigin
    ) {
      response.status(403).json({ message: 'Origin is not allowed' });
      return;
    }
    next();
  });
  app.enableCors({
    origin: config.getOrThrow<string>('frontendOrigin'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Empora API')
    .setDescription('Authentication, profiles and employee surveys')
    .setVersion('1.0')
    .addCookieAuth('empora_access', { type: 'apiKey', in: 'cookie' })
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get<number>('port', 3001));
}
void bootstrap();
