// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Prefer const where possible
      'prefer-const': 'error',
      // No unused vars (TypeScript version handles type-only imports correctly)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow explicit `any` with a warning rather than hard error — useful in adapters/generics
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Test files get slightly relaxed rules
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  }
);
