function parsePostgresUrl(value: string, variableName: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`${variableName} must be a PostgreSQL URL`);
  }

  return url;
}

function databaseIdentity(url: URL): string {
  const port = url.port || '5432';
  const databaseName = decodeURIComponent(url.pathname.slice(1));

  return `${url.hostname.toLowerCase()}:${port}/${databaseName}`;
}

export function assertDedicatedTestDatabaseUrl(
  testDatabaseUrl: string | undefined,
  developmentDatabaseUrl: string | undefined,
): string {
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required');
  }

  const testUrl = parsePostgresUrl(testDatabaseUrl, 'TEST_DATABASE_URL');
  const testIdentity = databaseIdentity(testUrl);

  if (developmentDatabaseUrl) {
    const developmentUrl = parsePostgresUrl(
      developmentDatabaseUrl,
      'DATABASE_URL',
    );

    if (testIdentity === databaseIdentity(developmentUrl)) {
      throw new Error('TEST_DATABASE_URL must not match DATABASE_URL');
    }
  }

  const testDatabaseName = decodeURIComponent(testUrl.pathname.slice(1));

  if (!testDatabaseName.endsWith('_test')) {
    throw new Error('Test database name must end with _test');
  }

  return testDatabaseUrl;
}
