// @ts-check

import config from '@ngvihoa/eslint-config-best-practices'

export default [
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
    ignores: [
      '.output/**',
      '.tanstack/**',
      'dist/**',
      'drizzle/**',
      'src/routeTree.gen.ts',
    ],
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
    },
  },
  {
    files: ['src/router.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
]
