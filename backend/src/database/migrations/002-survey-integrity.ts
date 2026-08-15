import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE surveys
         ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

       CREATE UNIQUE INDEX surveys_one_published
         ON surveys (is_published)
         WHERE is_published = true;

       ALTER TABLE questions
         ADD CONSTRAINT questions_id_survey_id_unique
         UNIQUE (id, survey_id);

       ALTER TABLE question_options
         ADD CONSTRAINT question_options_id_question_id_unique
         UNIQUE (id, question_id);

       ALTER TABLE survey_responses
         ADD CONSTRAINT survey_responses_id_survey_id_unique
         UNIQUE (id, survey_id);

       ALTER TABLE answers ADD COLUMN survey_id uuid;

       UPDATE answers
          SET survey_id = survey_responses.survey_id
         FROM survey_responses
        WHERE survey_responses.id = answers.response_id;

       ALTER TABLE answers
         ALTER COLUMN survey_id SET NOT NULL,
         ADD CONSTRAINT answers_response_survey_fk
           FOREIGN KEY (response_id, survey_id)
           REFERENCES survey_responses (id, survey_id)
           ON DELETE CASCADE,
         ADD CONSTRAINT answers_question_survey_fk
           FOREIGN KEY (question_id, survey_id)
           REFERENCES questions (id, survey_id)
           ON DELETE RESTRICT,
         ADD CONSTRAINT answers_option_question_fk
           FOREIGN KEY (option_id, question_id)
           REFERENCES question_options (id, question_id)
           ON DELETE RESTRICT;

       CREATE INDEX answers_survey_id ON answers (survey_id);`,
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS answers_survey_id;

       ALTER TABLE answers
         DROP CONSTRAINT IF EXISTS answers_option_question_fk,
         DROP CONSTRAINT IF EXISTS answers_question_survey_fk,
         DROP CONSTRAINT IF EXISTS answers_response_survey_fk,
         DROP COLUMN IF EXISTS survey_id;

       ALTER TABLE survey_responses
         DROP CONSTRAINT IF EXISTS survey_responses_id_survey_id_unique;

       ALTER TABLE question_options
         DROP CONSTRAINT IF EXISTS question_options_id_question_id_unique;

       ALTER TABLE questions
         DROP CONSTRAINT IF EXISTS questions_id_survey_id_unique;

       DROP INDEX IF EXISTS surveys_one_published;

       ALTER TABLE surveys DROP COLUMN IF EXISTS is_anonymous;`,
      { transaction },
    );
  });
}
