import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  eslintConfigPrettier,
);
