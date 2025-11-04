/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    'apps/api/vitest.config.ts',
    'apps/web/postcss.config.js',
    'packages/eslint/index.js',
    'prisma/seed.ts',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './apps/web/tsconfig.json',
      './apps/api/tsconfig.json',
      './packages/ui/tsconfig.json',
      './packages/validation/tsconfig.json',
    ],
    tsconfigRootDir: process.cwd(),
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
      extends: ['next', 'next/core-web-vitals'],
      rules: {
        'next/no-html-link-for-pages': 'off',
      },
    },
    {
      files: ['**/*.{js,jsx}'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
