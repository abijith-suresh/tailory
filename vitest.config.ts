import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    passWithNoTests: true,
    // Uncomment to enable coverage reporting:
    // coverage: {
    //   provider: "v8",
    //   reporter: ["text", "lcov"],
    //   include: ["src/**/*.{ts,astro}"],
    //   exclude: ["src/test/**", "src/env.d.ts"],
    // },
  },
});
