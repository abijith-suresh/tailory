import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

export const RESUME_FIXTURE = fileURLToPath(new URL("./resume.json", import.meta.url));

export const FIXTURE_NAME = "Ada Fixture";
export const EDITED_LABEL = "Principal Engineer";

// Some browsers expose navigator.share for files, and exportPDF() prefers it over a download.
// Remove it so every browser takes the download path. Runs again on each reload.
export async function removeNavigatorShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
}

export async function importFixtureResume(page: Page) {
  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(RESUME_FIXTURE);
  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(FIXTURE_NAME);
}

export async function editLabel(page: Page) {
  await page.getByRole("textbox", { name: "Title / Label" }).fill(EDITED_LABEL);
}

// Autosave is debounced; the draft button reads "Saved" once IndexedDB has the edit.
export async function waitForAutosave(page: Page) {
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
}
