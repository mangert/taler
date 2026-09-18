const jwtExpirationPattern = /^[1-9]\d*(?:ms|s|m|h|d|w)$/;

function requireString(config: Record<string, unknown>, key: string): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function requirePositiveInteger(
  config: Record<string, unknown>,
  key: string,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const value = config[key];
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${key} must be an integer between 1 and ${maximum}`);
  }

  return parsed;
}

function requireUrl(
  config: Record<string, unknown>,
  key: string,
  protocols: readonly string[],
): URL {
  const value = requireString(config, key);

  try {
    const url = new URL(value);

    if (!protocols.includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }

    return url;
  } catch {
    throw new Error(`${key} must be a valid ${protocols.join(' or ')} URL`);
  }
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl = requireUrl(config, 'DATABASE_URL', [
    'postgres:',
    'postgresql:',
  ]).toString();
  const jwtSecret = requireString(config, 'JWT_SECRET');
  const jwtExpiresIn = requireString(config, 'JWT_EXPIRES_IN');
  const frontendOriginValue = requireString(config, 'FRONTEND_ORIGIN');
  const frontendOrigin = requireUrl(config, 'FRONTEND_ORIGIN', [
    'http:',
    'https:',
  ]).origin;

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  if (!jwtExpirationPattern.test(jwtExpiresIn)) {
    throw new Error(
      'JWT_EXPIRES_IN must be a positive duration such as 15m or 1h',
    );
  }

  if (frontendOriginValue !== frontendOrigin) {
    throw new Error('FRONTEND_ORIGIN must contain only an HTTP(S) origin');
  }

  return {
    ...config,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    FRONTEND_ORIGIN: frontendOrigin,
    PORT: requirePositiveInteger(config, 'PORT', 65_535),
    CSV_MAX_FILE_SIZE_BYTES: requirePositiveInteger(
      config,
      'CSV_MAX_FILE_SIZE_BYTES',
    ),
    CSV_MAX_ROWS: requirePositiveInteger(config, 'CSV_MAX_ROWS'),
  };
}
