// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    rules: {
      // NestJS relies heavily on decorator metadata and DI tokens that are
      // legitimately `any` at the framework boundary (e.g. Kysely query
      // results, raw `sql` template rows) — warn instead of erroring so the
      // linter is useful without demanding a rewrite of established patterns.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
    },
  },
);
