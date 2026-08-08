import { Sequelize } from 'sequelize-typescript';
import { models } from './models';

export function createSequelize(databaseUrl = process.env.DATABASE_URL) {
  return new Sequelize(
    databaseUrl ?? 'postgres://empora:empora@localhost:5432/empora',
    {
      dialect: 'postgres',
      logging: false,
      models,
    },
  );
}
