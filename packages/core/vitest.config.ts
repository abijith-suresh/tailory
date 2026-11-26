import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "src/index.ts",
        "src/templates/template-fixtures.ts",
        "src/test/**",
      ],
      thresholds: {
        branches: 70,
        functions: 95,
        lines: 90,
        statements: 90,
      },
    },
  },
});
