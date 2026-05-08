import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const importFixturePath = path.resolve("tests/smoke/fixtures/import-resume.json");

async function readAutosaveName(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    return await new Promise<string | null>((resolve) => {
      const openRequest = indexedDB.open("tailory", 1);

      openRequest.onerror = () => resolve(null);
      openRequest.onsuccess = () => {
        const db = openRequest.result;
        const tx = db.transaction("drafts", "readonly");
        const getRequest = tx.objectStore("drafts").get("autosave");

        getRequest.onerror = () => resolve(null);
        getRequest.onsuccess = () => {
          const name = getRequest.result?.resumeData?.basics?.name;
          resolve(typeof name === "string" && name.length > 0 ? name : null);
        };
      };
    });
  });
}

test("imports a resume, allows an edit, and triggers PDF export", async ({ page }) => {
  await page.goto("/editor");

  await page.getByLabel("Import resume file").setInputFiles(importFixturePath);

  await expect(page.getByLabel("Full Name")).toHaveValue("Jane Smoke");
  await expect(page.getByText("Imported resume used by the browser smoke suite.")).toBeVisible();

  await page.getByRole("button", { name: "Summary" }).click();
  await page.getByLabel("Professional Summary").fill("Updated browser smoke summary.");
  await expect(page.getByText("Updated browser smoke summary.")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export PDF/i }).click(),
  ]);

  await expect(download.suggestedFilename()).toMatch(/Jane_Smoke.*\.pdf$/u);
});

test("restores autosave when the editor is reopened", async ({ context, page }) => {
  await page.goto("/editor");
  await page.getByLabel("Full Name").fill("Autosave Smoke");

  await expect
    .poll(() => readAutosaveName(page), {
      timeout: 10_000,
      message: "expected autosave draft to be written to IndexedDB",
    })
    .toBe("Autosave Smoke");

  const restoredPage = await context.newPage();
  await restoredPage.goto("/editor");

  await expect(restoredPage.getByLabel("Full Name")).toHaveValue("Autosave Smoke");
  await restoredPage.close();
});
