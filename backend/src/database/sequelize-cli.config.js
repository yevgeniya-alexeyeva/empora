require('dotenv/config');

const url =
  process.env.DATABASE_URL ??
  'postgres://empora:empora@localhost:5432/empora';

const config = {
  url,
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
