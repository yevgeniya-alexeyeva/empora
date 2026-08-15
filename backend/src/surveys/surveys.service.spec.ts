import { BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import {
  Question,
  QuestionOption,
  Survey,
  SurveyResponse,
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

  it('does not expose user data in anonymous survey results', async () => {
    const surveys = {
      findByPk: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue(true),
      }),
    } as unknown as typeof Survey;
    let receivedOptions: object | undefined;
    const findResponses = jest.fn((options: object): Promise<never[]> => {
      receivedOptions = options;
      return Promise.resolve([]);
    });
    const responses = {
      findAll: findResponses,
    } as unknown as typeof SurveyResponse;
    const service = new SurveysService(
      surveys,
      {} as typeof Question,
      {} as typeof QuestionOption,
      responses,
    );

    await service.results('survey-id');

    expect(findResponses).toHaveBeenCalledTimes(1);
    const options = receivedOptions as {
      attributes: { exclude: string[] };
      include: unknown[];
    };
    expect(options.attributes).toEqual({ exclude: ['userId'] });
    expect(options.include).toHaveLength(1);
  });
});
