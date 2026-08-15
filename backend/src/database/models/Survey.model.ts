import {
  AllowNull,
  Column,
  DataType,
  Default,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Question } from './Question.model';
import { SurveyResponse } from './SurveyResponse.model';

@Table({ tableName: 'surveys', underscored: true })
export class Survey extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare title: string;

  @AllowNull(false)
  @Default('')
  @Column(DataType.TEXT)
  declare description: string;

  @AllowNull(false)
  @Default(false)
  @Index
  @Column(DataType.BOOLEAN)
  declare isPublished: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isAnonymous: boolean;

  @HasMany(() => Question)
  declare questions: Question[];

  @HasMany(() => SurveyResponse)
  declare responses: SurveyResponse[];
}
