import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type Download, expect, type Page } from "@playwright/test";

export const RESUME_FIXTURE = fileURLToPath(new URL("./resume.json", import.meta.url));

export const EXTRA_FIELDS_FIXTURE = fileURLToPath(
  new URL("./resume-with-extra-fields.json", import.meta.url)
);

export const FIXTURE_NAME = "Ada Fixture";
export const EDITED_LABEL = "Principal Engineer";

export async function importFixtureResume(page: Page) {
  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(RESUME_FIXTURE);
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(FIXTURE_NAME);
}

export async function editLabel(page: Page) {
  await page.getByRole("textbox", { name: "Headline" }).fill(EDITED_LABEL);
}

/** Picks an item from the Export menu and returns the file it downloads. */
export async function exportFromMenu(page: Page, item: string | RegExp): Promise<Download> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: item }).click();
  return download;
}

export async function readJsonDownload(download: Download) {
  return JSON.parse(await readFile(await download.path(), "utf8"));
}

/** Adds a version for a job and opens it. */
export async function createVersion(page: Page, name: string, jobTitle = "") {
  await page.getByRole("banner").getByRole("button", { name: "New version" }).click();
  const dialog = page.getByRole("dialog", { name: "New version" });
  await dialog.getByRole("textbox", { name: "Name (optional)" }).fill(name);
  if (jobTitle) await dialog.getByRole("textbox", { name: "Job title" }).fill(jobTitle);
  await dialog.getByRole("button", { name: "Create version" }).click();
  await expect(page.getByRole("tab", { name, selected: true })).toBeVisible();
}

/** Opens a section of the form from the section list. */
export async function openSection(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: new RegExp(`^${label}`) })
    .click();
  await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
}

// Autosave waits two seconds, then writes to IndexedDB. A busy machine can stretch that past the
// default expect timeout, so poll the saved draft with a longer one. The draft is more reliable
// than the "Saved" label, which shows for only two seconds and can be missed.
export async function waitForAutosave(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<string | undefined>((resolve, reject) => {
              const open = indexedDB.open("tailory");
              open.onerror = () => reject(open.error);
              open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains("drafts")) {
                  db.close();
                  return resolve(undefined);
                }
                const get = db.transaction("drafts").objectStore("drafts").get("autosave");
                get.onerror = () => reject(get.error);
                get.onsuccess = () => {
                  db.close();
                  resolve(get.result?.document?.master?.basics?.label);
                };
              };
            })
        ),
      { timeout: 20_000 }
    )
    .toBe(EDITED_LABEL);
}

/** Creates the database as Tailory's first storage version did, with a saved resume in it. */
export async function seedVersion1Autosave(page: Page, name: string) {
  await page.evaluate(
    (savedName) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("tailory", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("drafts", { keyPath: "id" });
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("drafts", "readwrite");
          tx.objectStore("drafts").put({
            id: "autosave",
            name: savedName,
            createdAt: 1,
            updatedAt: 1,
            resumeData: {
              basics: { name: savedName, label: "Saved before versions" },
              work: [
                {
                  id: "work-1",
                  name: "Example Labs",
                  position: "Engineer",
                  highlights: ["Kept through the upgrade"],
                },
              ],
            },
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    name
  );
}
