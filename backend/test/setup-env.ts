import { assertDedicatedTestDatabaseUrl } from '../src/common/database/test-database-safety.js';

const developmentDatabaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://taler_dev:local_dev_only@localhost:5432/taler_dev?schema=public';

process.env.TEST_DATABASE_URL ??=
  'postgresql://taler_test:local_test_only@localhost:5432/taler_test?schema=public';
process.env.DATABASE_URL = assertDedicatedTestDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  developmentDatabaseUrl,
);
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';
process.env.JWT_EXPIRES_IN ??= '15m';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
process.env.PORT ??= '3000';
process.env.CSV_MAX_FILE_SIZE_BYTES ??= '5242880';
process.env.CSV_MAX_ROWS ??= '10000';
