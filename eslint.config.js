// ESLint flat config (v9+). Decisoes:
// 1. typescript-eslint recommended-type-checked para regras semanticas pesadas.
// 2. prettier desliga regras estilisticas — formatador cuida disso.
// 3. ignorar dist/, external/ e arquivos gerados.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.tsup/**',
      'coverage/**',
      'external/**',
      'site/**',
      '**/*.tsbuildinfo',
      'packages/*/dist/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // erros comuns
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      // ESM puro: imports relativos exigem extensao .js
      '@typescript-eslint/no-require-imports': 'error',
      // permitir non-null assertion onde necessario (zod parse, etc)
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettierConfig,
);
