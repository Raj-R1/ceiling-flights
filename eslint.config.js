const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['dist/**', 'out/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false,
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
