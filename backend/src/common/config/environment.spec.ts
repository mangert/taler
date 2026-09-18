import { validateEnvironment } from './environment.js';

const validEnvironment: Record<string, unknown> = {
  DATABASE_URL: 'postgresql://taler:taler@localhost:5432/taler?schema=public',
  JWT_SECRET: 'development-secret-at-least-32-characters',
  JWT_EXPIRES_IN: '15m',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: '3000',
  CSV_MAX_FILE_SIZE_BYTES: '5242880',
  CSV_MAX_ROWS: '10000',
};

describe('validateEnvironment', () => {
  it('normalizes validated numeric settings', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      PORT: 3000,
      CSV_MAX_FILE_SIZE_BYTES: 5_242_880,
      CSV_MAX_ROWS: 10_000,
    });
  });

  it.each([
    ['DATABASE_URL', 'mysql://localhost/taler'],
    ['JWT_SECRET', 'too-short'],
    ['JWT_EXPIRES_IN', 'tomorrow'],
    ['FRONTEND_ORIGIN', 'localhost:5173'],
    ['PORT', '70000'],
    ['CSV_MAX_FILE_SIZE_BYTES', '0'],
    ['CSV_MAX_ROWS', '-1'],
  ] as const)('rejects an invalid %s value', (key, value) => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, [key]: value }),
    ).toThrow(key);
  });

  it('rejects a missing required value', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_URL: undefined }),
    ).toThrow('DATABASE_URL');
  });
});
