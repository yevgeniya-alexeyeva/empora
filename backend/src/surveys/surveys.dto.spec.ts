import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateSurveyDto,
  PaginationQueryDto,
  SubmitSurveyDto,
  UpdateSurveyDto,
} from './surveys.dto';

describe('PaginationQueryDto', () => {
  it('uses defaults and transforms query strings to numbers', () => {
    const defaults = plainToInstance(PaginationQueryDto, {});
    const pagination = plainToInstance(PaginationQueryDto, {
      page: '3',
      limit: '50',
    });

    expect(defaults).toEqual(expect.objectContaining({ page: 1, limit: 20 }));
    expect(pagination).toEqual(expect.objectContaining({ page: 3, limit: 50 }));
  });

  it('rejects a limit above 100', async () => {
    const pagination = plainToInstance(PaginationQueryDto, {
      page: '1',
      limit: '101',
    });

    const errors = await validate(pagination);

    const limitError = errors.find((error) => error.property === 'limit');
    expect(limitError?.constraints).toHaveProperty('max');
  });
});

describe('survey text validation', () => {
  it('trims required human text before validation', async () => {
    const survey = plainToInstance(CreateSurveyDto, {
      title: '  Quarterly survey  ',
      description: '  Team feedback  ',
      questions: [
        {
          title: '  How are you?  ',
          options: [
            { value: 1, label: '  Poor  ' },
            { value: 5, label: '  Great  ' },
          ],
        },
      ],
    });

    await expect(validate(survey)).resolves.toHaveLength(0);
    expect(survey).toMatchObject({
      title: 'Quarterly survey',
      description: 'Team feedback',
      questions: [
        {
          title: 'How are you?',
          options: [{ label: 'Poor' }, { label: 'Great' }],
        },
      ],
    });
  });

  it('rejects required text containing only whitespace', async () => {
    const survey = plainToInstance(CreateSurveyDto, {
      title: '   ',
      questions: [],
    });

    const errors = await validate(survey);

    expect(errors.find((error) => error.property === 'title')).toBeDefined();
  });

  it('normalizes blank optional description and comment to undefined', () => {
    const update = plainToInstance(UpdateSurveyDto, {
      description: '   ',
    });
    const submission = plainToInstance(SubmitSurveyDto, {
      answers: [],
      comment: '   ',
    });

    expect(update.description).toBeUndefined();
    expect(submission.comment).toBeUndefined();
  });
});
