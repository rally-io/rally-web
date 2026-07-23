import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },

  // Application code (browser runtime)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Long-standing scaffold rules. We intentionally do NOT pull in
      // react-hooks v7's `recommended` preset because it now bundles the
      // experimental React Compiler rules, which would flood a codebase that
      // wasn't written for the compiler.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Advisory, non-blocking: `any` is used deliberately in the API generic
      // wrappers (src/types/api.ts, src/services/api/*) and test mocks. Keep it
      // visible without failing CI; tighten to 'error' if we ever type those out.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Node-side files: serverless functions and Vite/Vitest config.
  {
    files: ['api/**/*.ts', 'vite.config.ts', 'vitest.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
