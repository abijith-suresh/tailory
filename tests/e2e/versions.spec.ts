import { writeFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import {
  createVersion,
  exportFromMenu,
  FIXTURE_NAME,
  importFixtureResume,
  openSection,
  readJsonDownload,
} from "./fixtures/editor";

const FIRST_BULLET = "Shipped a private editor with no server component.";
const SECOND_BULLET = "Cut PDF export time in half.";
const REWORDED = "Shipped a private resume editor that never uploads anything.";

/** Opens a version for a job, leaves out the second bullet and rewords the first. */
async function tailorVersion(page: Page) {
  await page.goto("/editor");
  await importFixtureResume(page);
  await createVersion(page, "Acme", "Frontend engineer");
  await openSection(page, "Work experience");

  await page.getByRole("checkbox", { name: "Keep highlight 2" }).uncheck();
  await expect(page.getByText(SECOND_BULLET)).toHaveClass(/line-through/);

  await page.getByRole("textbox", { name: "Highlight 1" }).fill(REWORDED);
  await expect(page.getByText("Reworded", { exact: true })).toBeVisible();
  await expect(page.getByText("4 of 5 kept").first()).toBeAttached();

  // Phones show the form or the preview, so switch to the preview there.
  const previewTab = page.getByRole("tab", { name: "Preview" });
  const onPhone = await previewTab.isVisible();
  if (onPhone) await previewTab.click();
  const preview = page.getByRole("document", { name: "Preview of Acme" });
  await expect(preview).toContainText(REWORDED);
  await expect(preview).not.toContainText(SECOND_BULLET);
  if (onPhone) await page.getByRole("tab", { name: "Edit" }).click();
}

test("tailor a version, then export just that version as JSON Resume", async ({ page }) => {
  await tailorVersion(page);

  const versionJson = await exportFromMenu(page, /^JSON Resume of this version/);
  expect(versionJson.suggestedFilename()).toBe("Ada_Fixture_Acme.json");
  const tailored = await readJsonDownload(versionJson);
  expect(tailored.work[0].highlights).toEqual([REWORDED]);

  // The master keeps both bullets in their original words.
  await page.getByRole("tab", { name: "Master" }).click();
  await expect(page.getByRole("textbox", { name: "Highlight 1" })).toHaveValue(FIRST_BULLET);
  const master = await readJsonDownload(await exportFromMenu(page, /^JSON Resume of Master/));
  expect(master.work[0].highlights).toEqual([FIRST_BULLET, SECOND_BULLET]);
});

test("move between versions with the arrow keys", async ({ page }) => {
  await page.goto("/editor");
  await importFixtureResume(page);
  await createVersion(page, "Acme");
  await createVersion(page, "Globex");

  await page.getByRole("tab", { name: "Globex" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Acme" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Acme" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Master" })).toHaveAttribute("aria-selected", "true");
});

test("delete a version after confirming in a dialog", async ({ page }) => {
  await page.goto("/editor");
  await importFixtureResume(page);
  await createVersion(page, "Acme");

  await page.getByRole("button", { name: "Options for Acme" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete “Acme”?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Acme" })).toBeVisible();

  await page.getByRole("button", { name: "Options for Acme" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete version" }).click();
  await expect(page.getByRole("tab", { name: "Acme" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Master" })).toHaveAttribute("aria-selected", "true");
});

test("a backup brings back every version when imported", async ({ page }, testInfo) => {
  await tailorVersion(page);

  const backup = await exportFromMenu(page, /^Backup/);
  expect(backup.suggestedFilename()).toBe("Ada_Fixture_tailory-backup.json");
  const backupPath = testInfo.outputPath("backup.json");
  await writeFile(backupPath, JSON.stringify(await readJsonDownload(backup)));

  // Start over with nothing saved, then import the backup.
  await page.goto("/");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("tailory");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
  );
  await page.goto("/editor");
  await expect(page.getByRole("tab", { name: "Acme" })).toHaveCount(0);
  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(backupPath);
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(FIXTURE_NAME);

  await page.getByRole("tab", { name: "Acme" }).click();
  const restored = await readJsonDownload(
    await exportFromMenu(page, /^JSON Resume of this version/)
  );
  expect(restored.work[0].highlights).toEqual([REWORDED]);
});
