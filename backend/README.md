# Empora API

NestJS API for authentication, employee profiles, and surveys, backed by
PostgreSQL and Sequelize.

## Local setup

Requires Node.js 20 or newer, npm, and Docker. From the repository root:

```powershell
docker compose up -d
Copy-Item backend\.env.example backend\.env
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

The API is served at `http://localhost:3001/api`. Swagger is served at
`http://localhost:3001/docs` only when `SWAGGER_ENABLED=true`.

`NODE_ENV` is mandatory and must be exactly `development`, `test`, or
`production`. In production, set `DATABASE_URL`, `FRONTEND_ORIGIN`, and two
different random JWT secrets of at least 32 characters. Set
`COOKIE_SECURE=true` behind HTTPS and normally disable Swagger. Never commit
real secrets or production administrator credentials.

The seed command creates an administrator and, when there are no surveys, one
published sample survey. Development and test environments may use the local
credential defaults; production requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Database and survey invariants

Run all pending migrations before starting or seeding the API:

```powershell
npm run db:migrate
```

Migration `002-survey-integrity` adds database-level answer ownership checks,
the survey anonymous-mode flag, and a partial unique index that permits at most
one published survey. Publishing another survey therefore returns a conflict
until the current survey is unpublished.

Anonymous mode affects administrative results: responses do not expose the
responding user's identifier or user record. Authentication and the
one-response-per-user rule still apply.

## Scripts

```text
npm run build          Compile the application
npm run format         Format source and test files
npm run lint           Lint and fix source and test files
npm run typecheck      Type-check without emitting files
npm run test           Run unit tests
npm run test:watch     Run unit tests in watch mode
npm run test:cov       Run unit tests with coverage
npm run test:debug     Run unit tests under the debugger
npm run test:e2e       Run database-backed end-to-end tests
npm run db:migrate     Apply pending migrations
npm run db:rollback    Revert the latest migration
npm run db:seed        Seed an administrator and sample survey
npm run start:dev      Start in watch mode
npm run start:prod     Start the compiled application
```

## Isolated end-to-end database

End-to-end tests create persistent records and must not target the development
or production database. Create a separate PostgreSQL database, migrate and seed
it, then run the suite with `NODE_ENV=test` and its URL:

```powershell
$env:NODE_ENV = "test"
$env:DATABASE_URL = "postgres://empora:empora@localhost:5432/empora_e2e"
npm run db:migrate
npm run db:seed
npm run test:e2e
```

The E2E suite does not create, migrate, truncate, or clean the database for you.
