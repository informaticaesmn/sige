module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "linebreak-style": "off", // Desactiva la regla de saltos de línea (problema común en Windows)
    "max-len": ["error", {"code": 120}],
  },
  overrides: [
    {
      files: ["**/*.test.js", "**/*.spec.js"],
      env: {
        mocha: true,
      },
      rules: {
        "max-len": "off", // Desactivar la longitud máxima de línea en tests
        "require-jsdoc": "off", // Desactivar la necesidad de JSDoc en tests
        "valid-jsdoc": "off", // Desactivar la validación de JSDoc en tests
      },
    },
  ],
  globals: {},
};
