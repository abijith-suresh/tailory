import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vitest/config";

// Two postures: components render to HTML on the server (`*.test.tsx`), and behaviour that needs
// a DOM (focus, keys, timers) runs client-compiled in jsdom (`*.dom.test.tsx`).
const DOM_TESTS = "src/**/*.dom.test.tsx";

export default defineConfig({
  plugins: [solid({ ssr: true })],
  test: {
    // PGlite runs initdb on first open, which takes a second or two.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The Postgres tests share one database and reset its schema, so they can't overlap.
    fileParallelism: !process.env.TAILORY_TEST_DATABASE_URL,
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [DOM_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: [DOM_TESTS],
          setupFiles: ["./src/testing/dom-setup.ts"],
        },
      },
    ],
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
