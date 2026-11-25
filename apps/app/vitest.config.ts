import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // PGlite runs initdb on first open, which takes a second or two.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The Postgres tests share one database and reset its schema, so they can't overlap.
    fileParallelism: !process.env.TAILORY_TEST_DATABASE_URL,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/server/**/*.ts", "src/middleware.ts"],
      // Generated tables and test helpers.
      exclude: ["**/*.test.ts", "src/server/db/auth-schema.ts", "src/server/testing/**"],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
