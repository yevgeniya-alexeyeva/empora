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
import { Question } from './Question.model';

@Table({ tableName: 'question_options', underscored: true })
export class QuestionOption extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Question)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare questionId: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare value: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare label: string;

  @BelongsTo(() => Question)
  declare question: Question;
}
