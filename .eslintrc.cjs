module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "security"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:security/recommended",
  ],
  rules: {
    // Security rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",

    // TypeScript rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // General rules
    "no-console": ["warn", { allow: ["error", "warn", "info"] }],
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["dist", "node_modules", "coverage", ".vitest"],
};
