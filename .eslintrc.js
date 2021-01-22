module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    // WebdriverIO support.
    mocha: true,
    jest: true,
  },
  globals: {
    // WebdriverIO support.
    browser: false,
    $: false,
    $$: false,
  },
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {},
};
