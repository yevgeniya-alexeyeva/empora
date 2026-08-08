import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import {
  Answer,
  Question,
  QuestionOption,
  Survey,
  SurveyResponse,
  User,
} from '../database/models';
import {
  CreateQuestionDto,
  CreateSurveyDto,
  SubmitSurveyDto,
  UpdateSurveyDto,
} from './surveys.dto';

const surveyInclude = [
  {
    model: Question,
    include: [QuestionOption],
  },
];

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey) private readonly surveys: typeof Survey,
    @InjectModel(Question) private readonly questions: typeof Question,
    @InjectModel(QuestionOption)
    private readonly options: typeof QuestionOption,
    @InjectModel(SurveyResponse)
    private readonly responses: typeof SurveyResponse,
  ) {}

  listPublished() {
    return this.surveys.findAll({
      where: { isPublished: true },
      attributes: ['id', 'title', 'description', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  }

  async getPublished(id: string) {
    const survey = await this.surveys.findOne({
      where: { id, isPublished: true },
      include: surveyInclude,
      order: [
        [Question, 'position', 'ASC'],
        [Question, QuestionOption, 'value', 'ASC'],
      ],
    });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  listAdmin() {
    return this.surveys.findAll({
      include: surveyInclude,
      order: [['createdAt', 'DESC']],
    });
  }

  async getAdmin(id: string) {
    const survey = await this.surveys.findByPk(id, { include: surveyInclude });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async create(dto: CreateSurveyDto) {
    this.validateQuestionOptions(dto.questions);
    return this.surveys.sequelize!.transaction(async (transaction) => {
      const survey = await this.surveys.create(
        { title: dto.title, description: dto.description ?? '' },
        { transaction },
      );
      await this.createQuestions(survey.id, dto.questions, transaction);
      return this.getAdmin(survey.id);
    });
  }

  async update(id: string, dto: UpdateSurveyDto) {
    const survey = await this.getAdmin(id);
    await survey.update(dto);
    return survey;
  }

  async replaceQuestions(id: string, questions: CreateQuestionDto[]) {
    this.validateQuestionOptions(questions);
    const survey = await this.getAdmin(id);
    if (survey.isPublished) {
      throw new ConflictException(
        'Unpublish the survey before editing questions',
      );
    }
    if (await this.responses.count({ where: { surveyId: id } })) {
      throw new ConflictException(
        'Questions cannot be changed after responses are collected',
      );
    }
    await this.surveys.sequelize!.transaction(async (transaction) => {
      await this.questions.destroy({ where: { surveyId: id }, transaction });
      await this.createQuestions(id, questions, transaction);
    });
    return this.getAdmin(id);
  }

  async publish(id: string, isPublished: boolean) {
    const survey = await this.getAdmin(id);
    survey.isPublished = isPublished;
    await survey.save();
    return survey;
  }

  async remove(id: string) {
    const survey = await this.getAdmin(id);
    if (await this.responses.count({ where: { surveyId: id } })) {
      throw new ConflictException('Survey with responses cannot be deleted');
    }
    await survey.destroy();
  }

  async submit(surveyId: string, userId: string, dto: SubmitSurveyDto) {
    const survey = await this.getPublished(surveyId);
    const questionIds = survey.questions.map((question) => question.id);
    if (
      dto.answers.length !== questionIds.length ||
      new Set(dto.answers.map((answer) => answer.questionId)).size !==
        questionIds.length
    ) {
      throw new BadRequestException(
        'Exactly one answer per question is required',
      );
    }

    const validOptions = new Map(
      survey.questions.flatMap((question) =>
        question.options.map((option) => [option.id, question.id]),
      ),
    );
    for (const answer of dto.answers) {
      if (
        !questionIds.includes(answer.questionId) ||
        validOptions.get(answer.optionId) !== answer.questionId
      ) {
        throw new BadRequestException('An answer contains an invalid option');
      }
    }

    try {
      return await this.surveys.sequelize!.transaction(async (transaction) => {
        const response = await this.responses.create(
          { surveyId, userId, comment: dto.comment?.trim() || null },
          { transaction },
        );
        await Answer.bulkCreate(
          dto.answers.map((answer) => ({
            responseId: response.id,
            questionId: answer.questionId,
            optionId: answer.optionId,
          })),
          { transaction },
        );
        return response;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        (error as { name?: string }).name === 'SequelizeUniqueConstraintError'
      ) {
        throw new ConflictException('Survey has already been submitted');
      }
      throw error;
    }
  }

  async results(id: string) {
    await this.getAdmin(id);
    return this.responses.findAll({
      where: { surveyId: id },
      include: [
        { model: Answer, include: [Question, QuestionOption] },
        { model: User, attributes: ['id', 'email', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  private validateQuestionOptions(questions: CreateQuestionDto[]) {
    for (const question of questions) {
      const values = question.options.map((option) => option.value);
      if (new Set(values).size !== values.length) {
        throw new BadRequestException(
          'Option values must be unique per question',
        );
      }
    }
  }

  private async createQuestions(
    surveyId: string,
    questions: CreateQuestionDto[],
    transaction: Transaction,
  ) {
    for (const [position, dto] of questions.entries()) {
      const question = await this.questions.create(
        { surveyId, title: dto.title, position },
        { transaction },
      );
      await this.options.bulkCreate(
        dto.options.map((option) => ({ ...option, questionId: question.id })),
        { transaction },
      );
    }
  }
}
