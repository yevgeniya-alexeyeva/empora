import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/http-exception.filter';

export function originProtection(
  frontendOrigin: string,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const origin = request.get('origin');
    const apiOrigin = `${request.protocol}://${request.get('host')}`;

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
  };
}

export function configureApp(
  app: INestApplication,
  config: ConfigService,
): void {
  const frontendOrigin = config.getOrThrow<string>('frontendOrigin');

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.use(originProtection(frontendOrigin));
  app.enableCors({
    origin: frontendOrigin,
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
}
