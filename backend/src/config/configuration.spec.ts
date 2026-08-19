import { describe, expect, it } from '@jest/globals';
import { validateEnvironment } from './configuration';

const productionEnvironment = {
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'postgres://empora:empora@db:5432/empora',
  FRONTEND_ORIGIN: 'https://empora.example.com',
  JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
};

describe('validateEnvironment', () => {
  it.each(['development', 'test'])(
    'allows development defaults in %s',
    (NODE_ENV) => {
      const result = validateEnvironment({ NODE_ENV });

      expect(result.PORT).toBe('3001');
      expect(result.DATABASE_URL).toContain('localhost');
      expect(result.SWAGGER_ENABLED).toBe(
        NODE_ENV === 'development' ? 'true' : 'false',
      );
    },
  );

  it.each([
    'PORT',
    'DATABASE_URL',
    'FRONTEND_ORIGIN',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_TTL',
    'JWT_REFRESH_TTL',
  ])('requires %s in production', (key) => {
    const config: Record<string, unknown> = { ...productionEnvironment };
    delete config[key];

    expect(() => validateEnvironment(config)).toThrow(
      `${key} is required in production`,
    );
  });

  it.each(['', 'staging', 'Development'])(
    'rejects unsupported NODE_ENV %s',
    (NODE_ENV) => {
      expect(() => validateEnvironment({ NODE_ENV })).toThrow(
        'NODE_ENV must be one of',
      );
    },
  );

  it.each(['0', '65536', '3001.5', 'not-a-port'])(
    'rejects invalid PORT %s',
    (PORT) => {
      expect(() =>
        validateEnvironment({ ...productionEnvironment, PORT }),
      ).toThrow('PORT must be an integer');
    },
  );

  it('validates URLs, TTLs, booleans, and JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        DATABASE_URL: 'mysql://db/empora',
      }),
    ).toThrow('DATABASE_URL');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        FRONTEND_ORIGIN: 'https://empora.example.com/app',
      }),
    ).toThrow('FRONTEND_ORIGIN');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        JWT_ACCESS_TTL: '15 minutes',
      }),
    ).toThrow('Unsupported JWT TTL');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        JWT_ACCESS_SECRET: 'too-short',
      }),
    ).toThrow('at least 32 characters');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        JWT_REFRESH_SECRET: productionEnvironment.JWT_ACCESS_SECRET,
      }),
    ).toThrow('must be different');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        SWAGGER_ENABLED: 'yes',
      }),
    ).toThrow('SWAGGER_ENABLED');
  });

  it('keeps Swagger disabled by default in production', () => {
    expect(validateEnvironment(productionEnvironment).SWAGGER_ENABLED).toBe(
      'false',
    );
  });
});
