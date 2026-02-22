import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/cli/**",
        "src/types/**"
      ],
      thresholds: {
        global: {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        // Security components require higher coverage
        "src/security/**": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        "src/validators/**": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
      },
    },
    setupFiles: ["tests/setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
