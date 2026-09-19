import { assertDedicatedTestDatabaseUrl } from './test-database-safety.js';

describe('assertDedicatedTestDatabaseUrl', () => {
  const developmentUrl =
    'postgresql://taler_dev:local_dev_only@localhost:5432/taler_dev?schema=public';

  it('accepts a database dedicated to tests', () => {
    expect(() =>
      assertDedicatedTestDatabaseUrl(
        'postgresql://taler_test:local_test_only@localhost:5432/taler_test?schema=public',
        developmentUrl,
      ),
    ).not.toThrow();
  });

  it('rejects the development database', () => {
    expect(() =>
      assertDedicatedTestDatabaseUrl(developmentUrl, developmentUrl),
    ).toThrow('TEST_DATABASE_URL must not match DATABASE_URL');
  });

  it('rejects a database without the _test suffix', () => {
    expect(() =>
      assertDedicatedTestDatabaseUrl(
        'postgresql://taler_test:local_test_only@localhost:5432/taler?schema=public',
        developmentUrl,
      ),
    ).toThrow('Test database name must end with _test');
  });
});
