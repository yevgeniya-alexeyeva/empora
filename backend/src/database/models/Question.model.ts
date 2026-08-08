import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { QuestionOption } from './QuestionOption.model';
import { Survey } from './Survey.model';

@Table({ tableName: 'questions', underscored: true })
export class Question extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Survey)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare surveyId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare title: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare position: number;

  @BelongsTo(() => Survey)
  declare survey: Survey;

  @HasMany(() => QuestionOption)
  declare options: QuestionOption[];
}
