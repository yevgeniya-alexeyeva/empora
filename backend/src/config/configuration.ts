import { parseTtlSeconds } from '../auth/ttl';

const ENVIRONMENTS = ['development', 'test', 'production'] as const;
const DEVELOPMENT_DEFAULTS = {
  PORT: '3001',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgres://empora:empora@localhost:5432/empora',
  JWT_ACCESS_SECRET: 'development-access-secret-change-me-123456',
  JWT_REFRESH_SECRET: 'development-refresh-secret-change-me-12345',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
} as const;

type NodeEnvironment = (typeof ENVIRONMENTS)[number];

function requiredString(
  config: Record<string, unknown>,
  key: keyof typeof DEVELOPMENT_DEFAULTS,
  environment: NodeEnvironment,
) {
  const value = config[key];
  if (typeof value === 'string' && value.length > 0) return value;
  if (environment !== 'production') return DEVELOPMENT_DEFAULTS[key];
  throw new Error(`${key} is required in production`);
}

function parseBoolean(value: unknown, key: string, fallback: boolean) {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key} must be either "true" or "false"`);
}

function validateDatabaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }
}

function normalizeFrontendOrigin(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.pathname !== '' && url.pathname !== '/') ||
    url.search ||
    url.hash
  ) {
    throw new Error('FRONTEND_ORIGIN must be a valid HTTP(S) origin');
  }
  return url.origin;
}

export const configuration = () => {
  const env = validateEnvironment(process.env);
  return {
    port: Number(env.PORT),
    frontendOrigin: env.FRONTEND_ORIGIN,
    databaseUrl: env.DATABASE_URL,
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
    cookieSecure: env.COOKIE_SECURE === 'true',
    swaggerEnabled: env.SWAGGER_ENABLED === 'true',
  };
};

export function validateEnvironment(config: Record<string, unknown>) {
  if (
    typeof config.NODE_ENV !== 'string' ||
    !ENVIRONMENTS.includes(config.NODE_ENV as NodeEnvironment)
  ) {
    throw new Error(`NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`);
  }

  const environment = config.NODE_ENV as NodeEnvironment;
  const validated: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(config).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
    NODE_ENV: environment,
  };

  for (const key of Object.keys(
    DEVELOPMENT_DEFAULTS,
  ) as (keyof typeof DEVELOPMENT_DEFAULTS)[]) {
    validated[key] = requiredString(config, key, environment);
  }

  const port = Number(validated.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  validated.PORT = String(port);

  validateDatabaseUrl(validated.DATABASE_URL);
  validated.FRONTEND_ORIGIN = normalizeFrontendOrigin(
    validated.FRONTEND_ORIGIN,
  );
  parseTtlSeconds(validated.JWT_ACCESS_TTL);
  parseTtlSeconds(validated.JWT_REFRESH_TTL);

  if (validated.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  }
  if (validated.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must contain at least 32 characters');
  }
  if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error('JWT access and refresh secrets must be different');
  }

  validated.COOKIE_SECURE = String(
    parseBoolean(config.COOKIE_SECURE, 'COOKIE_SECURE', false),
  );
  validated.SWAGGER_ENABLED = String(
    parseBoolean(
      config.SWAGGER_ENABLED,
      'SWAGGER_ENABLED',
      environment === 'development',
    ),
  );

  return validated;
}
