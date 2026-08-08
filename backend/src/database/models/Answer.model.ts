import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { QuestionOption } from './QuestionOption.model';
import { Question } from './Question.model';
import { SurveyResponse } from './SurveyResponse.model';

@Table({ tableName: 'answers', underscored: true })
export class Answer extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => SurveyResponse)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare responseId: string;

  @ForeignKey(() => Question)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare questionId: string;

  @ForeignKey(() => QuestionOption)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare optionId: string;

  @BelongsTo(() => SurveyResponse)
  declare response: SurveyResponse;

  @BelongsTo(() => Question)
  declare question: Question;

  @BelongsTo(() => QuestionOption)
  declare option: QuestionOption;
}
