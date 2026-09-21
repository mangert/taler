import { readFile, writeFile } from 'node:fs/promises';

import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const openApiUrl = new URL(
  process.env.TALER_OPENAPI_URL ?? 'http://127.0.0.1:3000/api/docs-json',
);
const outputUrl = new URL('../src/shared/api/schema.d.ts', import.meta.url);
const shouldCheck = process.argv.includes('--check');
const generatedTypes = `${COMMENT_HEADER}${astToString(
  await openapiTS(openApiUrl, { silent: true }),
)}`;

if (shouldCheck) {
  let currentTypes;

  try {
    currentTypes = await readFile(outputUrl, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(
        'Generated API types are missing. Run npm run api:generate.',
      );
      process.exitCode = 1;
    } else {
      throw error;
    }
  }

  if (currentTypes !== undefined) {
    if (currentTypes === generatedTypes) {
      console.log('Generated API types are up to date.');
    } else {
      console.error('Generated API types are not up to date.');
      process.exitCode = 1;
    }
  }
} else {
  await writeFile(outputUrl, generatedTypes, 'utf8');
  console.log(`Generated API types from ${openApiUrl.href}.`);
}
