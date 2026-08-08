# Empora

Empora consists of a Next.js frontend in `empora/` and a NestJS API in
`backend/`. PostgreSQL stores users, refresh sessions, surveys and responses.

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
cd empora
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`, the API at
`http://localhost:3001/api`, and Swagger at `http://localhost:3001/docs`.

The seed administrator defaults to `admin@empora.local` / `ChangeMe123!`.
Override `ADMIN_EMAIL` and `ADMIN_PASSWORD` outside a local environment.

## Database commands

From `backend/`, run `npm run db:migrate` to apply migrations,
`npm run db:rollback` to revert the latest migration, and `npm run db:seed` to
create the administrator and demonstration survey.

## Verification

```powershell
cd backend
npm run lint
npm test
npm run test:e2e
npm run build

cd ..\empora
npm run lint
npm run build
```

The end-to-end test expects a migrated and seeded local PostgreSQL database.
