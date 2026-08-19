// @ts-check

import config from '@ngvihoa/eslint-config-best-practices'

export default [
  {
    ignores: [
      '.output/**',
      '.tanstack/**',
      '.vercel/**',
      'dist/**',
      'drizzle/**',
      'playwright-report/**',
      'src/routeTree.gen.ts',
      'test-results/**',
    ],
  },
  ...config.react,
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Preset dùng process.cwd(), nhưng ESLint extension không luôn khởi động
        // tại project root. Cố định root giúp type-aware rules resolve cùng tsconfig.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'import-x/order': 'off',
      'no-nested-ternary': 'off',
      'no-multiple-empty-lines': [
        'error',
        {
          max: 1,
          maxBOF: 0,
          maxEOF: 0,
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['src/router.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
]
