import defineConfig from '@antfu/eslint-config'

export default defineConfig(
  {
    type: 'lib',
    stylistic: {
      quotes: 'single',
      semi: false,
      overrides: {
        'style/arrow-parens': ['warn', 'always'],
        'style/comma-dangle': ['warn', 'never']
      }
    },
    imports: {
      overrides: {
        'import/consistent-type-specifier-style': ['warn', 'inline']
      }
    },
    typescript: {
      overrides: {
        'ts/explicit-function-return-type': 'off',
        'ts/no-import-type-side-effects': ['off'],
        'perfectionist/sort-imports': ['warn', {
          type: 'natural',
          order: 'asc',
          newlinesBetween: 1,
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
            'side-effect'
          ]
        }]
      }
    },
    rules: {
      'no-throw-literal': 'off',
      'ts/no-empty-object-type': 'off',
      'node/prefer-global/process': 'off'
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'ts/no-empty-function': 'off',
      'ts/no-unsafe-function-type': 'off'
    }
  }
)
