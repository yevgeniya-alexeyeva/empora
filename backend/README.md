# Empora API

NestJS API for user authentication, employee profiles, and surveys. Built with
PostgreSQL and Sequelize.

## Setup

Requires Node.js, npm, and Docker.

```bash
# From the repository root
docker compose up -d

cd backend
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run start:dev
```

The API runs at `http://localhost:3001/api`. Swagger documentation is available
at `http://localhost:3001/docs`.

The seed command creates:

- an administrator (`admin@empora.local` / `ChangeMe123!`);
- a published sample survey.

Override the administrator credentials with `ADMIN_EMAIL` and `ADMIN_PASSWORD`
in `.env`.

## Scripts

```bash
npm run build          # Build the application
npm run format         # Format source and test files
npm run start          # Start the application
npm run start:dev      # Start in watch mode
npm run start:debug    # Start in debug and watch mode
npm run start:prod     # Start the production build
npm run db:migrate     # Apply pending migrations
npm run db:rollback    # Revert the latest migration
npm run db:seed        # Create the administrator and sample survey
npm run lint           # Lint and fix source files
npm run test           # Run unit tests
npm run test:watch     # Run unit tests in watch mode
npm run test:cov       # Run unit tests with coverage
npm run test:debug     # Run unit tests with the debugger
npm run test:e2e       # Run end-to-end tests
```

Environment variables are documented in `.env.example`. Production requires
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and
`FRONTEND_ORIGIN`.
