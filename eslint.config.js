// @ts-check

import config from '@ngvihoa/eslint-config-best-practices'

export default [
  ...config.react,
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
    },
  },
  {
    files: ['src/router.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
]
