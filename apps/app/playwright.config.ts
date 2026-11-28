import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Runs the built app (npm run build first) in local mode, on a private port and a fresh data
// folder, so a run never touches ~/.tailory. Set PLAYWRIGHT_PORT to move it.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4473);
const baseURL = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), "tailory-e2e-"));

const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
const phone = { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: "e2e",
  reporter: [["list"], ["html", { open: "never" }]],
  // The pages share one database; one worker keeps the runs from stepping on each other.
  workers: 1,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop-light", use: { ...desktop, colorScheme: "light" } },
    { name: "desktop-dark", use: { ...desktop, colorScheme: "dark" } },
    { name: "phone-light", use: { ...phone, colorScheme: "light" } },
    { name: "phone-dark", use: { ...phone, colorScheme: "dark" } },
  ],
  webServer: {
    command: `node bin/tailory.mjs --port ${port} --data-dir ${dataDir}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
