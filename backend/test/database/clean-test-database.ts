import { Client } from 'pg';

import { assertDedicatedTestDatabaseUrl } from '../../src/common/database/test-database-safety.js';

const connectionString = assertDedicatedTestDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const client = new Client({ connectionString });

try {
  await client.connect();

  const tables = await client.query<{ qualified_name: string }>(`
    SELECT format('%I.%I', schemaname, tablename) AS qualified_name
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  if (tables.rows.length > 0) {
    const tableList = tables.rows
      .map(({ qualified_name: qualifiedName }) => qualifiedName)
      .join(', ');

    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  }

  console.log(`Cleaned test database (${tables.rows.length} tables).`);
} finally {
  await client.end();
}
