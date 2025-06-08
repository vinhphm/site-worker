import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    formatters: true,
  },
  {
    rules: {
      'format/prettier': 'off',
      'no-labels': 'off',
      'no-lone-blocks': 'off',
      'no-restricted-syntax': 'off',
      'no-useless-catch': 'off',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'prefer-rest-params': 'off',
      'symbol-description': 'off',
      'style/operator-linebreak': 'off',
      'style/brace-style': 'off',
      'ts/ban-types': 'off',
      'ts/no-invalid-this': 'off',
      'ts/no-unnecessary-type-constraint': 'off',
      'no-console': 'off',
    },
  },
)
