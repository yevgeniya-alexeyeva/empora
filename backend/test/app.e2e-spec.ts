import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { User, UserRole } from '../src/database/models';

describe('Empora API (e2e)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  let email: string;
  let activeSurvey: {
    id: string;
    questions: Array<{ id: string; options: Array<{ id: string }> }>;
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
    agent = request.agent(app.getHttpServer());
    email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  });

  describe('origin protection', () => {
    it('rejects unsafe requests from an untrusted origin', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'https://attacker.example')
        .send({ email: 'nobody@example.com', password: 'Password123!' })
        .expect(403);
    });
  });

  describe('auth', () => {
    it('registers, refreshes and reads the authenticated profile', async () => {
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'Password123!', name: 'E2E User' })
        .expect(201);
      await agent.post('/api/auth/refresh').expect(200);
      const profileResponse = await agent.get('/api/users/me').expect(200);

      expect((profileResponse.body as { email: string }).email).toBe(email);
    });
  });

  describe('validation', () => {
    it('rejects invalid and non-whitelisted fields', async () => {
      await agent
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'short',
          unexpected: true,
        })
        .expect(400);
    });
  });

  describe('authorization', () => {
    it('requires authentication and blocks a regular user from admin APIs', async () => {
      await request(app.getHttpServer()).get('/api/surveys').expect(401);
      await agent.get('/api/admin/surveys').expect(403);
    });
  });

  describe('surveys', () => {
    it('lists and returns the seeded active survey', async () => {
      const surveysResponse = await agent.get('/api/surveys').expect(200);
      const surveys = surveysResponse.body as Array<{ id: string }>;
      expect(surveys).toHaveLength(1);

      const surveyResponse = await agent
        .get(`/api/surveys/${surveys[0].id}`)
        .expect(200);
      activeSurvey = surveyResponse.body as typeof activeSurvey;
      expect(activeSurvey.questions.length).toBeGreaterThan(0);
    });

    it('accepts one response and rejects a repeat submission', async () => {
      const payload = {
        answers: activeSurvey.questions.map((question) => ({
          questionId: question.id,
          optionId: question.options[0].id,
        })),
      };

      await agent
        .post(`/api/surveys/${activeSurvey.id}/responses`)
        .send(payload)
        .expect(201);
      await agent
        .post(`/api/surveys/${activeSurvey.id}/responses`)
        .send(payload)
        .expect(409);
    });
  });

  describe('admin survey invariants', () => {
    beforeAll(async () => {
      await User.update({ role: UserRole.ADMIN }, { where: { email } });
      await agent.post('/api/auth/refresh').expect(200);
    });

    it('creates a survey with its nested questions transactionally', async () => {
      const title = `E2E transactional ${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
      const createdResponse = await agent
        .post('/api/admin/surveys')
        .send({
          title,
          description: 'Persistent E2E fixture; do not reuse by title',
          questions: [
            {
              title: 'Transactional question',
              options: [
                { value: 1, label: 'Low' },
                { value: 5, label: 'High' },
              ],
            },
          ],
        })
        .expect(201);
      const created = createdResponse.body as {
        id: string;
        title: string;
        questions: Array<{ options: unknown[] }>;
      };

      expect(created.title).toBe(title);
      expect(created.questions).toHaveLength(1);
      expect(created.questions[0].options).toHaveLength(2);
    });

    it('enforces one active survey', async () => {
      const createdResponse = await agent
        .post('/api/admin/surveys')
        .send({
          title: `E2E inactive ${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          questions: [
            {
              title: 'Publish conflict question',
              options: [
                { value: 1, label: 'No' },
                { value: 2, label: 'Yes' },
              ],
            },
          ],
        })
        .expect(201);
      const created = createdResponse.body as { id: string };

      await agent
        .patch(`/api/admin/surveys/${created.id}/publication`)
        .send({ isPublished: true })
        .expect(409);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
