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
import { User } from './User.model';

@Table({ tableName: 'refresh_sessions', underscored: true })
export class RefreshSession extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare userId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare tokenHash: string;

  @AllowNull(false)
  @Index
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @BelongsTo(() => User)
  declare user: User;
}
