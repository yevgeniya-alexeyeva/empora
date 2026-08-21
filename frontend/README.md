# Empora

This directory contains the Next.js frontend. The NestJS API lives in
`../backend`, and PostgreSQL stores users, refresh sessions, surveys, and
responses.

## Local setup

Requirements: Node.js 20 or newer, npm and Docker.

From the repository root:

```powershell
docker compose up -d
Copy-Item backend\.env.example backend\.env
Copy-Item empora\.env.example empora\.env.local
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`, the API at
`http://localhost:3001/api`, and Swagger at `http://localhost:3001/docs` when
`SWAGGER_ENABLED=true`.

The backend requires `NODE_ENV` to be `development`, `test`, or `production`.
Replace the example JWT secrets with two different random values of at least 32
characters. Never commit real secrets. Production must also provide explicit
database, origin, and administrator settings and should normally disable
Swagger.

## Database commands

From `backend/`, run `npm run db:migrate` to apply migrations,
`npm run db:rollback` to revert the latest migration, and `npm run db:seed` to
create the administrator and demonstration survey when needed. Migration
`002-survey-integrity` enforces answer relationships, adds anonymous surveys,
and allows at most one published survey.

Anonymous surveys still require authentication and still prevent repeat
responses. Their administrative result payloads omit respondent identity.

## Frontend environment

`NEXT_PUBLIC_API_URL` is used by browser requests. `API_URL` is the server-side
API base URL and may differ in containerized deployments. Neither variable
should contain credentials or secrets.

## Verification

```powershell
cd backend
npm run lint
npm run typecheck
npm test
npm run build

cd ..\empora
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` is intentionally separate: it writes persistent records and
must use a dedicated migrated and seeded database such as `empora_e2e`, never
the development or production database. See `../backend/README.md` for the
isolated E2E procedure.
