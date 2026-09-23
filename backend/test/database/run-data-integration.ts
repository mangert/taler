import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

import { assertDedicatedTestDatabaseUrl } from '../../src/common/database/test-database-safety.js';

const defaultDevelopmentDatabaseUrl =
  'postgresql://taler_dev:local_dev_only@localhost:5432/taler_dev?schema=public';
const defaultTestDatabaseUrl =
  'postgresql://taler_test:local_test_only@localhost:5432/taler_test?schema=public';
const developmentDatabaseUrl =
  process.env.DATABASE_URL ?? defaultDevelopmentDatabaseUrl;
const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const testDatabaseUrl = assertDedicatedTestDatabaseUrl(
  process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl,
  developmentDatabaseUrl,
);
const childEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
};

const runNode = (
  label: string,
  arguments_: string[],
  workingDirectory = projectRoot,
  environment = childEnvironment,
): void => {
  console.log(`\n> ${label}`);

  const result = spawnSync(process.execPath, arguments_, {
    cwd: workingDirectory,
    env: environment,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? 'unknown'}`,
    );
  }
};

const rebuildSchema = async (): Promise<void> => {
  const client = new Client({ connectionString: testDatabaseUrl });

  try {
    await client.connect();
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  console.log('Recreated public schema in the dedicated test database.');
};

await rebuildSchema();

const prismaCli = resolve(projectRoot, 'node_modules/prisma/build/index.js');
const prismaConfig = resolve(projectRoot, 'backend/prisma.config.ts');

runNode(
  'Apply Prisma migrations',
  [prismaCli, 'migrate', 'deploy', '--config', prismaConfig],
  resolve(projectRoot, 'backend'),
);
runNode(
  'Seed test database',
  [prismaCli, 'db', 'seed', '--config', prismaConfig],
  resolve(projectRoot, 'backend'),
);
runNode(
  'Run data integration tests',
  [
    '--experimental-vm-modules',
    resolve(projectRoot, 'node_modules/jest/bin/jest.js'),
    '--config',
    resolve(projectRoot, 'backend/test/jest-integration.config.cjs'),
    '--runInBand',
  ],
  projectRoot,
  {
    ...childEnvironment,
    DATABASE_URL: developmentDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
  },
);
