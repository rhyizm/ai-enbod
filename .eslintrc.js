module.exports = {
  "root": true,
  "env": {
    "es2021": true,
    "node": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:next/core-web-vitals"
  ],
  "parser": '@typescript-eslint/parser',
  "parserOptions": {
    "sourceType": 'module',
    "ecmaVersion": 12,
    "tsconfigRootDir": __dirname,
    "project": ['tsconfig.json']
  },
  "plugins": [
    '@typescript-eslint',
    'jest',
    'next'
  ],
  "ignorePatterns": ['.eslintrc.js'],
  "rules": {
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    "indent": ["error", 2],
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
