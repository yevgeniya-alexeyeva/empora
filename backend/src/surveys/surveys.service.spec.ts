import { BadRequestException } from '@nestjs/common';
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
});
