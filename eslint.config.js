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
  },
  {
    files: ['app/renderer/src/components/overlay/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../ui/*',
            '../../ui/*',
            './ui/*',
            '**/renderer/src/ui/*',
            '**/*.module.css',
            './styles.css',
            '../styles.css',
            '../../styles.css',
            '**/renderer/src/styles.css'
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='className']",
          message: 'No className in overlay components. Use Mantine props/theme styles only.'
        },
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: 'Use Mantine Button/ActionIcon in overlay components.'
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: 'Use Mantine TextInput/NumberInput in overlay components.'
        }
      ]
    }
  },
  {
    files: ['app/renderer/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['**/renderer/src/ui/*', './ui/*', '../ui/*', '../../ui/*', '../../../ui/*'],
          paths: [
            {
              name: './components/SettingsOverlay',
              message: 'Use Mantine overlay from ./components/overlay instead of legacy SettingsOverlay.'
            },
            {
              name: './components/SettingsOverlay.tsx',
              message: 'Use Mantine overlay from ./components/overlay instead of legacy SettingsOverlay.'
            }
          ]
        }
      ]
    }
  }
];
