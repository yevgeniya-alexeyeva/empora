import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Answer } from './Answer.model';
import { Survey } from './Survey.model';
import { User } from './User.model';

@Table({
  tableName: 'survey_responses',
  underscored: true,
  indexes: [{ unique: true, fields: ['survey_id', 'user_id'] }],
})
export class SurveyResponse extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Survey)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare surveyId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @Column(DataType.TEXT)
  declare comment: string | null;

  @HasMany(() => Answer)
  declare answers: Answer[];

  @BelongsTo(() => Survey)
  declare survey: Survey;

  @BelongsTo(() => User)
  declare user: User;
}
