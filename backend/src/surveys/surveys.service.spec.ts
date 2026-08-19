import { BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import {
  Question,
  QuestionOption,
  Survey,
  SurveyResponse,
  User,
} from '../database/models';
import { SurveysService } from './surveys.service';

describe('SurveysService', () => {
  it('requires one answer for every survey question', async () => {
    const service = new SurveysService(
      {} as typeof Survey,
      {} as typeof Question,
      {} as typeof QuestionOption,
      {} as typeof SurveyResponse,
    );
    jest.spyOn(service, 'getPublished').mockResolvedValue({
      questions: [
        { id: 'question-1', options: [{ id: 'option-1' }] },
        { id: 'question-2', options: [{ id: 'option-2' }] },
      ],
    } as Survey);

    await expect(
      service.submit('survey', 'user', {
        answers: [{ questionId: 'question-1', optionId: 'option-1' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('loads survey details only after the create transaction commits', async () => {
    const transaction = {} as Transaction;
    let committed = false;
    const createSurvey = jest.fn().mockResolvedValue({ id: 'survey-id' });
    const surveys = {
      sequelize: {
        transaction: jest.fn(
          async (callback: (transaction: Transaction) => Promise<string>) => {
            const result = await callback(transaction);
            committed = true;
            return result;
          },
        ),
      },
      create: createSurvey,
    } as unknown as typeof Survey;
    const questions = {
      create: jest.fn().mockResolvedValue({ id: 'question-id' }),
    } as unknown as typeof Question;
    const options = {
      bulkCreate: jest.fn().mockResolvedValue([]),
    } as unknown as typeof QuestionOption;
    const service = new SurveysService(
      surveys,
      questions,
      options,
      {} as typeof SurveyResponse,
    );
    const details = { id: 'survey-id' } as Survey;
    const getSurveyDetails = jest
      .spyOn(service, 'getSurveyDetails')
      .mockImplementation(() => {
        expect(committed).toBe(true);
        return Promise.resolve(details);
      });

    await expect(
      service.create({
        title: 'Survey',
        isAnonymous: true,
        questions: [
          {
            title: 'Question',
            options: [
              { value: 1, label: 'No' },
              { value: 5, label: 'Yes' },
            ],
          },
        ],
      }),
    ).resolves.toBe(details);

    expect(createSurvey).toHaveBeenCalledWith(
      expect.objectContaining({ isAnonymous: true }),
      { transaction },
    );
    expect(getSurveyDetails).toHaveBeenCalledWith('survey-id');
  });

  it('uses the lightweight survey when replacing questions', async () => {
    const transaction = {} as Transaction;
    const survey = { id: 'survey-id', isPublished: false } as Survey;
    const findSurvey = jest.fn().mockResolvedValue(survey);
    const surveys = {
      findByPk: findSurvey,
      sequelize: {
        transaction: jest.fn(
          async (callback: (transaction: Transaction) => Promise<void>) =>
            callback(transaction),
        ),
      },
    } as unknown as typeof Survey;
    const questions = {
      destroy: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue({ id: 'question-id' }),
    } as unknown as typeof Question;
    const options = {
      bulkCreate: jest.fn().mockResolvedValue([]),
    } as unknown as typeof QuestionOption;
    const responses = {
      count: jest.fn().mockResolvedValue(0),
    } as unknown as typeof SurveyResponse;
    const service = new SurveysService(surveys, questions, options, responses);
    const getSurveyDetails = jest.spyOn(service, 'getSurveyDetails');

    await expect(
      service.replaceQuestions('survey-id', [
        {
          title: 'Question',
          options: [
            { value: 1, label: 'No' },
            { value: 5, label: 'Yes' },
          ],
        },
      ]),
    ).resolves.toBe(survey);

    expect(findSurvey).toHaveBeenCalledWith('survey-id');
    expect(getSurveyDetails).not.toHaveBeenCalled();
  });

  it('does not expose user data in anonymous survey results', async () => {
    const surveys = {
      findByPk: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue(true),
      }),
    } as unknown as typeof Survey;
    let receivedOptions: object | undefined;
    const findResponses = jest.fn((options: object) => {
      receivedOptions = options;
      return Promise.resolve({ rows: [], count: 0 });
    });
    const responses = {
      findAndCountAll: findResponses,
    } as unknown as typeof SurveyResponse;
    const service = new SurveysService(
      surveys,
      {} as typeof Question,
      {} as typeof QuestionOption,
      responses,
    );

    await expect(
      service.results('survey-id', { page: 2, limit: 20 }),
    ).resolves.toEqual({
      items: [],
      meta: { page: 2, limit: 20, total: 0, totalPages: 0 },
    });

    expect(findResponses).toHaveBeenCalledTimes(1);
    const options = receivedOptions as {
      attributes: { exclude: string[] };
      include: unknown[];
      distinct: boolean;
      limit: number;
      offset: number;
    };
    expect(options.attributes).toEqual({ exclude: ['userId'] });
    expect(options.include).toHaveLength(1);
    expect(options).toEqual(
      expect.objectContaining({
        distinct: true,
        limit: 20,
        offset: 20,
      }),
    );
  });

  it('includes only public user fields in named survey results', async () => {
    const surveys = {
      findByPk: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue(false),
      }),
    } as unknown as typeof Survey;
    let receivedOptions: object | undefined;
    const responses = {
      findAndCountAll: jest.fn((options: object) => {
        receivedOptions = options;
        return Promise.resolve({ rows: [{ id: 'response-id' }], count: 21 });
      }),
    } as unknown as typeof SurveyResponse;
    const service = new SurveysService(
      surveys,
      {} as typeof Question,
      {} as typeof QuestionOption,
      responses,
    );

    await expect(
      service.results('survey-id', { page: 3, limit: 10 }),
    ).resolves.toEqual({
      items: [{ id: 'response-id' }],
      meta: { page: 3, limit: 10, total: 21, totalPages: 3 },
    });

    const options = receivedOptions as {
      attributes?: unknown;
      include: Array<{ model: unknown; attributes?: string[] }>;
      limit: number;
      offset: number;
    };
    expect(options.attributes).toBeUndefined();
    expect(options.include).toHaveLength(2);
    expect(options.include[1]).toEqual({
      model: User,
      attributes: ['id', 'email', 'name'],
    });
    expect(options.limit).toBe(10);
    expect(options.offset).toBe(20);
  });

  it('paginates the admin survey list with a distinct count', async () => {
    let receivedOptions: object | undefined;
    const surveys = {
      findAndCountAll: jest.fn((options: object) => {
        receivedOptions = options;
        return Promise.resolve({ rows: [{ id: 'survey-id' }], count: 41 });
      }),
    } as unknown as typeof Survey;
    const service = new SurveysService(
      surveys,
      {} as typeof Question,
      {} as typeof QuestionOption,
      {} as typeof SurveyResponse,
    );

    await expect(service.listAdmin({ page: 3, limit: 20 })).resolves.toEqual({
      items: [{ id: 'survey-id' }],
      meta: { page: 3, limit: 20, total: 41, totalPages: 3 },
    });
    expect(receivedOptions).toEqual(
      expect.objectContaining({
        distinct: true,
        limit: 20,
        offset: 40,
      }),
    );
  });
});
