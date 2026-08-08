export const configuration = () => ({
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://empora:empora@localhost:5432/empora',
  accessSecret:
    process.env.JWT_ACCESS_SECRET ??
    'development-access-secret-change-me-123456',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ??
    'development-refresh-secret-change-me-12345',
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
});

export function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV === 'production') {
    for (const key of [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'FRONTEND_ORIGIN',
    ]) {
      if (!config[key]) {
        throw new Error(`${key} is required in production`);
      }
    }
  }

  return config;
}
