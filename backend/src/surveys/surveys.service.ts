import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  ForeignKeyConstraintError,
  Op,
  Transaction,
  UniqueConstraintError,
} from 'sequelize';
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
  PaginationQueryDto,
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
      attributes: ['id', 'title', 'description', 'isAnonymous', 'createdAt'],
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

  async listAdmin({ page, limit }: PaginationQueryDto) {
    const { rows, count } = await this.surveys.findAndCountAll({
      include: surveyInclude,
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit,
      offset: (page - 1) * limit,
    });
    return this.paginated(rows, page, limit, count);
  }

  async findSurveyOrThrow(id: string) {
    const survey = await this.surveys.findByPk(id);
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async getSurveyDetails(id: string) {
    const survey = await this.surveys.findByPk(id, { include: surveyInclude });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async create(dto: CreateSurveyDto) {
    this.validateQuestionOptions(dto.questions);
    try {
      const surveyId = await this.surveys.sequelize!.transaction(
        async (transaction) => {
          const survey = await this.surveys.create(
            {
              title: dto.title,
              description: dto.description ?? '',
              isAnonymous: dto.isAnonymous ?? false,
            },
            { transaction },
          );
          await this.createQuestions(survey.id, dto.questions, transaction);
          return survey.id;
        },
      );
      return this.getSurveyDetails(surveyId);
    } catch (error) {
      this.rethrowWriteConstraint(error);
    }
  }

  async update(id: string, dto: UpdateSurveyDto) {
    const survey = await this.findSurveyOrThrow(id);
    await survey.update(dto);
    return survey;
  }

  async replaceQuestions(id: string, questions: CreateQuestionDto[]) {
    this.validateQuestionOptions(questions);
    const survey = await this.findSurveyOrThrow(id);
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
    try {
      await this.surveys.sequelize!.transaction(async (transaction) => {
        await this.questions.destroy({ where: { surveyId: id }, transaction });
        await this.createQuestions(id, questions, transaction);
      });
      return survey;
    } catch (error) {
      this.rethrowWriteConstraint(error);
    }
  }

  async publish(id: string, isPublished: boolean) {
    try {
      return await this.surveys.sequelize!.transaction(async (transaction) => {
        const survey = await this.surveys.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!survey) throw new NotFoundException('Survey not found');

        if (isPublished) {
          const publishedSurvey = await this.surveys.findOne({
            where: { id: { [Op.ne]: id }, isPublished: true },
            transaction,
          });
          if (publishedSurvey) {
            throw new ConflictException('Another survey is already published');
          }
        }

        survey.isPublished = isPublished;
        await survey.save({ transaction });
        return survey;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Another survey is already published');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const survey = await this.findSurveyOrThrow(id);
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
            surveyId,
            questionId: answer.questionId,
            optionId: answer.optionId,
          })),
          { transaction },
        );
        return response;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Survey has already been submitted');
      }
      if (error instanceof ForeignKeyConstraintError) {
        throw new BadRequestException(
          'An answer does not belong to this survey',
        );
      }
      throw error;
    }
  }

  async results(id: string, { page, limit }: PaginationQueryDto) {
    const survey = await this.findSurveyOrThrow(id);
    const isAnonymous = Boolean(survey.get('isAnonymous'));
    const include = [
      { model: Answer, include: [Question, QuestionOption] },
      ...(!isAnonymous
        ? [{ model: User, attributes: ['id', 'email', 'name'] }]
        : []),
    ];
    const { rows, count } = await this.responses.findAndCountAll({
      where: { surveyId: id },
      attributes: isAnonymous ? { exclude: ['userId'] } : undefined,
      include,
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit,
      offset: (page - 1) * limit,
    });
    return this.paginated(rows, page, limit, count);
  }

  private paginated<T>(items: T[], page: number, limit: number, total: number) {
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  private rethrowWriteConstraint(error: unknown): never {
    if (error instanceof UniqueConstraintError) {
      throw new BadRequestException(
        'Question positions and option values must be unique',
      );
    }
    if (error instanceof ForeignKeyConstraintError) {
      throw new BadRequestException('Survey data violates integrity rules');
    }
    throw error;
  }
}
