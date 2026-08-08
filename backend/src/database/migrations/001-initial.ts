import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS pgcrypto',
      {
        transaction,
      },
    );
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_users_role" AS ENUM ('user', 'admin');
       CREATE TABLE users (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         email varchar(255) NOT NULL UNIQUE,
         password_hash varchar(255) NOT NULL,
         name varchar(255) NOT NULL DEFAULT '',
         role "enum_users_role" NOT NULL DEFAULT 'user',
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       );
       CREATE TABLE refresh_sessions (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         token_hash varchar(255) NOT NULL,
         expires_at timestamptz NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX refresh_sessions_user_id ON refresh_sessions(user_id);
       CREATE INDEX refresh_sessions_expires_at ON refresh_sessions(expires_at);
       CREATE TABLE surveys (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         title varchar(255) NOT NULL,
         description text NOT NULL DEFAULT '',
         is_published boolean NOT NULL DEFAULT false,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX surveys_is_published ON surveys(is_published);
       CREATE TABLE questions (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
         title text NOT NULL,
         position integer NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         UNIQUE (survey_id, position)
       );
       CREATE INDEX questions_survey_id ON questions(survey_id);
       CREATE TABLE question_options (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
         value integer NOT NULL CHECK (value BETWEEN 1 AND 5),
         label varchar(255) NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         UNIQUE (question_id, value)
       );
       CREATE INDEX question_options_question_id ON question_options(question_id);
       CREATE TABLE survey_responses (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE RESTRICT,
         user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         comment text,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         UNIQUE (survey_id, user_id)
       );
       CREATE TABLE answers (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
         question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
         option_id uuid NOT NULL REFERENCES question_options(id) ON DELETE RESTRICT,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         UNIQUE (response_id, question_id)
       );
       CREATE INDEX answers_response_id ON answers(response_id);`,
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS answers, survey_responses, question_options,
       questions, surveys, refresh_sessions, users CASCADE;
       DROP TYPE IF EXISTS "enum_users_role";`,
      { transaction },
    );
  });
}
