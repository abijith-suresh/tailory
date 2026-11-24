import { defineConfig, devices } from "@playwright/test";

// Astro's default dev/preview port. Set PLAYWRIGHT_PORT to run on a private port,
// for example when several checkouts run browser tests at once.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      // Marketing pages only. The editor flow and the desktop header assertions
      // assume a desktop layout, so they stay on the desktop projects.
      name: "mobile-chromium",
      testMatch: "**/smoke.spec.ts",
      grepInvert: /GitHub links sit in the footer/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `bun run preview --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    // Astro 7 auto-backgrounds `astro preview` in agentic shells, which makes
    // Playwright treat the server process as exited; keep it in the foreground.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
