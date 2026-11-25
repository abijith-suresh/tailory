import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    conditions: ["browser", "development"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      exclude: ["src/test/**", "**/*.d.ts", "**/*.test.*", "**/*.spec.*"],
      // The resume logic and its tests moved to packages/core, which gates them with higher
      // thresholds. These floors cover the editor UI, storage, and import code left here.
      thresholds: {
        branches: 52,
        functions: 50,
        lines: 68,
        statements: 63,
      },
    },
  },
});
