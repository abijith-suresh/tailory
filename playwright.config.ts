import { defineConfig, devices } from "@playwright/test";

// Astro's default dev/preview port; the repo does not override it.
const port = 4321;
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
  ],
  webServer: {
    command: "bun run preview --host 127.0.0.1",
    url: baseURL,
    // Astro 7 auto-backgrounds `astro preview` in agentic shells, which makes
    // Playwright treat the server process as exited; keep it in the foreground.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
