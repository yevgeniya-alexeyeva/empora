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

async function seed() {
  const sequelize = createSequelize();
  await sequelize.authenticate();
  const email = (process.env.ADMIN_EMAIL ?? 'admin@empora.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

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
