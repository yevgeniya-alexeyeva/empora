import 'dotenv/config';
import { hash } from 'bcryptjs';
import { Question, QuestionOption, Survey, User, UserRole } from './models';
import { createSequelize } from './sequelize';

const questions = [
  {
    title: 'How did you feel in the past week?',
    labels: ['Very low', 'A bit low', 'Neutral', 'Good', 'Excellent'],
  },
  {
    title:
      'Communication with top-level management is frequent and clear enough.',
    labels: [
      'Strongly disagree',
      'Disagree',
      'Neither agree nor disagree',
      'Agree',
      'Strongly agree',
    ],
  },
  {
    title: 'My team helps me to do my best.',
    labels: [
      'Strongly disagree',
      'Disagree',
      'Neither agree nor disagree',
      'Agree',
      'Strongly agree',
    ],
  },
];

function getAdminCredentials() {
  const environment = process.env.NODE_ENV;
  if (!['development', 'test', 'production'].includes(environment ?? '')) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  const allowsDefaults =
    environment === 'development' || environment === 'test';
  const email = (
    process.env.ADMIN_EMAIL ?? (allowsDefaults ? 'admin@empora.local' : '')
  ).toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD ?? (allowsDefaults ? 'ChangeMe123!' : '');

  if (!email) throw new Error('ADMIN_EMAIL is required in production');
  if (!password) throw new Error('ADMIN_PASSWORD is required in production');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters and include upper-case, lower-case, numeric, and special characters',
    );
  }

  return { email, password };
}

async function seed() {
  const { email, password } = getAdminCredentials();
  const sequelize = createSequelize();
  await sequelize.authenticate();

  await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      passwordHash: await hash(password, 12),
      name: 'Empora Admin',
      role: UserRole.ADMIN,
    },
  });

  if ((await Survey.count()) === 0) {
    await sequelize.transaction(async (transaction) => {
      const survey = await Survey.create(
        {
          title: 'Employee pulse survey',
          description: 'A short weekly employee experience survey.',
          isPublished: true,
        },
        { transaction },
      );
      for (const [position, item] of questions.entries()) {
        const question = await Question.create(
          { surveyId: survey.id, title: item.title, position },
          { transaction },
        );
        await QuestionOption.bulkCreate(
          item.labels.map((label, index) => ({
            questionId: question.id,
            value: index + 1,
            label,
          })),
          { transaction },
        );
      }
    });
  }

  await sequelize.close();
}

void seed();
