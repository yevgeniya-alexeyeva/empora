import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Empora API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('registers, refreshes, reads profile, submits survey and blocks admin API', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${Date.now()}@example.com`;

    await agent
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', name: 'E2E User' })
      .expect(201);
    await agent.post('/api/auth/refresh').expect(200);
    const profileResponse = await agent.get('/api/users/me').expect(200);
    const profile = profileResponse.body as { email: string };
    expect(profile.email).toBe(email);

    const surveysResponse = await agent.get('/api/surveys').expect(200);
    const surveys = surveysResponse.body as Array<{ id: string }>;
    expect(surveys.length).toBeGreaterThan(0);
    const surveyResponse = await agent
      .get(`/api/surveys/${surveys[0].id}`)
      .expect(200);
    const survey = surveyResponse.body as {
      id: string;
      questions: Array<{ id: string; options: Array<{ id: string }> }>;
    };
    await agent
      .post(`/api/surveys/${survey.id}/responses`)
      .send({
        answers: survey.questions.map((question) => ({
          questionId: question.id,
          optionId: question.options[0].id,
        })),
      })
      .expect(201);
    await agent.get('/api/admin/surveys').expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
