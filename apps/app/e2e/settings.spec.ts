import { readFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, type Page, test } from "@playwright/test";

import { FIRST_RUN, fillProfile } from "./helpers";

/**
 * Settings in local mode: General, Agents and Data, and no Account. Every test starts from the
 * state it needs, because the projects share one database.
 */

const settingsNav = (page: Page) => page.getByRole("navigation", { name: "Settings" });

/** Erases everything through Settings › Data, the way a person would. */
async function eraseAll(page: Page) {
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Erase…" }).click();
  const dialog = page.getByRole("dialog", { name: "Erase all data?" });
  await dialog.getByLabel("Type erase to confirm").fill("erase");
  await dialog.getByRole("button", { name: "Erase everything" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("heading", { level: 1, name: FIRST_RUN })).toBeVisible();
}

/** A real MCP call, as an agent that calls itself Claude Code. */
async function callAsAgent(page: Page) {
  const base = new URL(page.url()).origin;
  // SDK 2.x clients speak 2025 unless told otherwise; `auto` finds 2026-07-28.
  const client = new Client(
    { name: "Claude Code", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } }
  );
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", base)));
  try {
    await client.callTool({ name: "get_profile", arguments: {} });
  } finally {
    await client.close();
  }
}

test("/connect moved to Settings › Agents", async ({ page }) => {
  await page.goto("/connect");
  await expect(page).toHaveURL(/\/settings\/agents$/);
  await expect(page.getByRole("heading", { level: 2, name: "Agents" })).toBeVisible();
  await expect(settingsNav(page).locator('a[aria-current="page"]')).toHaveText("Agents");
});

test("local mode has General, Agents and Data, and no Account", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 2, name: "General" })).toBeVisible();
  await expect(settingsNav(page).getByRole("link")).toHaveText(["General", "Agents", "Data"]);
  await page.goto("/settings/account");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByText("Delete account")).toHaveCount(0);
});

test("the theme switches at once and stays after a reload", async ({ page }) => {
  await page.goto("/settings/general");
  const html = page.locator("html");
  const theme = page.getByRole("radiogroup", { name: "Theme" });
  await expect(theme.getByLabel("System")).toBeChecked();

  await theme.getByText("Dark").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(theme.getByLabel("Dark")).toBeChecked();

  await theme.getByText("Light").click();
  await expect(html).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(dark);

  await theme.getByText("System").click();
  await expect(html).not.toHaveAttribute("data-theme");
  await page.reload();
  await expect(html).not.toHaveAttribute("data-theme");
});

test("copies the MCP address and each client's setup", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/settings/agents");
  const url = `${new URL(page.url()).origin}/mcp`;
  await expect(page.locator(".address__url")).toHaveText(url);

  await page.getByRole("button", { name: "Copy the MCP address" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

  const tabs = page.getByRole("tablist", { name: "Agent client" }).getByRole("tab");
  await expect(tabs).toHaveText(["Claude Code", "Codex", "Cursor", "VS Code"]);
  await page.getByRole("button", { name: "Copy: Claude Code command" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `claude mcp add --transport http tailory ${url}`
  );
  await tabs.filter({ hasText: "Codex" }).click();
  await page.getByRole("button", { name: "Copy: Codex config.toml" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `[mcp_servers.tailory]\nurl = "${url}"`
  );
  await expect(page.getByText("Tailory speaks MCP 2026-07-28 only.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Full setup guide" })).toHaveAttribute(
    "target",
    "_blank"
  );
});

test("Check connection finds the agent once it calls", async ({ page }) => {
  await eraseAll(page);
  await page.goto("/settings/agents");
  const state = page.locator(".connection-check__state");
  await expect(state).toHaveText("Not checked yet");
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(state).toHaveText("No agent has connected yet");

  // The check keeps listening, so the call shows up without another click.
  await callAsAgent(page);
  await expect(state).toHaveText("Connected: Claude Code, just now", { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
});

test("Export everything downloads one JSON file", async ({ page }) => {
  await fillProfile(page, "Export Check");
  await page.goto("/settings/data");
  await expect(page.getByText("Stored on this computer")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^tailory-export-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(JSON.stringify(data)).toContain("Export Check");
});

test("erasing needs the word typed, and Cancel keeps everything", async ({ page }) => {
  await fillProfile(page, "Erase Check");
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Erase…" }).click();
  const dialog = page.getByRole("dialog", { name: "Erase all data?" });
  const confirm = dialog.getByRole("button", { name: "Erase everything" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type erase to confirm").fill("eras");
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();

  await eraseAll(page);
  await page.goto("/profile");
  await expect(page.getByLabel("Name", { exact: true }).first()).toHaveValue("");
});

test("first run shows only on an empty install, and leads to Agents and import", async ({
  page,
}) => {
  await eraseAll(page);
  const welcome = page.getByRole("heading", { level: 1, name: FIRST_RUN });
  await expect(page.getByRole("heading", { name: "Connect your agent" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import a resume" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New application" })).toHaveCount(0);

  await page.getByRole("link", { name: "Codex, Cursor or another client" }).click();
  await expect(page).toHaveURL(/\/settings\/agents$/);
  await page.goBack();
  await expect(welcome).toBeVisible();

  await page.getByRole("link", { name: /Choose a file/ }).click();
  await expect(page).toHaveURL(/\/profile\?import$/);
  await expect(page.locator("#import")).toBeFocused();

  // Once the profile has something in it, home is the board again.
  await fillProfile(page, "First Run Check");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  await expect(welcome).toHaveCount(0);
});

test("first run shows the agent connecting", async ({ page }) => {
  await eraseAll(page);
  const state = page.locator(".first-run__state");
  await expect(state).toHaveText("Waiting for your agent");
  await callAsAgent(page);
  await expect(state).toHaveText("Claude Code connected. Ask it to set up your profile.", {
    timeout: 10_000,
  });
});
