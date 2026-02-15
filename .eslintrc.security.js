/**
 * ESLint Security Rules Configuration
 *
 * This configuration extends the base ESLint config with security-focused rules.
 * Install required plugin: npm install eslint-plugin-security --save-dev
 */

module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended-legacy'],
  rules: {
    // ============================
    // Critical Security Rules
    // ============================

    // Detect eval() with non-literal argument
    'security/detect-eval-with-expression': 'error',

    // Detect Buffer with noAssert flag
    'security/detect-buffer-noassert': 'error',

    // Detect child_process usage
    'security/detect-child-process': 'warn',

    // Detect disabled mustache escape
    'security/detect-disable-mustache-escape': 'error',

    // Detect CSRF vulnerability pattern
    'security/detect-no-csrf-before-method-override': 'error',

    // Detect non-literal fs filename (path traversal)
    'security/detect-non-literal-fs-filename': 'warn',

    // Detect non-literal require (code injection)
    'security/detect-non-literal-require': 'warn',

    // Detect non-literal regexp (ReDoS)
    'security/detect-non-literal-regexp': 'warn',

    // Detect object injection
    'security/detect-object-injection': 'warn',

    // Detect possible timing attacks
    'security/detect-possible-timing-attacks': 'warn',

    // Detect pseudoRandomBytes usage (use crypto.randomBytes instead)
    'security/detect-pseudoRandomBytes': 'error',

    // Detect unsafe regex patterns (ReDoS)
    'security/detect-unsafe-regex': 'error',

    // Detect bidirectional characters (can hide malicious code)
    'security/detect-bidi-characters': 'error',

    // ============================
    // Additional Custom Rules
    // ============================

    // Disallow eval() and similar
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Disallow script URLs
    'no-script-url': 'error',

    // Require strict mode
    'strict': ['error', 'global'],

    // Disallow with statement
    'no-with': 'error',

    // Require const/let instead of var
    'no-var': 'error',

    // Disallow process.exit() in library code
    'no-process-exit': 'warn',

    // Prefer safer alternatives
    'prefer-template': 'warn',  // Helps avoid string injection

    // ============================
    // Node.js Security Rules
    // ============================

    // These require eslint-plugin-node
    // 'node/no-deprecated-api': 'error',
  },

  overrides: [
    // Backend-specific rules
    {
      files: ['**/backend/**/*.ts', '**/backend/**/*.js', '**/api/**/*.ts'],
      rules: {
        // Stricter rules for backend code
        'security/detect-child-process': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-non-literal-require': 'error',
      },
    },
    // Frontend-specific rules
    {
      files: ['**/src/**/*.tsx', '**/src/**/*.jsx', '**/components/**/*.tsx'],
      rules: {
        // XSS prevention
        'security/detect-disable-mustache-escape': 'error',
        // Less strict for frontend
        'security/detect-object-injection': 'off',  // Too many false positives in React
      },
    },
    // Test files - relaxed rules
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
      rules: {
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-require': 'off',
      },
    },
  ],

  // Environment settings
  env: {
    node: true,
    browser: true,
    es2022: true,
  },

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
};