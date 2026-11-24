import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type Download, expect, type Page, test } from "@playwright/test";
import { createVersion, exportFromMenu } from "./fixtures/editor";

// Four jobs of five bullets: two pages on the Modern template, one once tightened.
const LONG_FIXTURE = fileURLToPath(new URL("./fixtures/resume-long.json", import.meta.url));

async function pdfPages(download: Download) {
  const bytes = await readFile(await download.path());
  return bytes.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;
}

/** The fit readout beside the page target, such as "1 page · fits". */
const readout = (page: Page) => page.getByTestId("page-fit-readout");

/** Shows the preview on phones, where the form and the preview take turns. */
async function showPreview(page: Page) {
  const previewTab = page.getByRole("tab", { name: "Preview" });
  if (await previewTab.isVisible()) await previewTab.click();
}

/** Whether the autosaved first version may be tightened, read from IndexedDB. */
function savedAutoFit(page: Page) {
  return page.evaluate(
    () =>
      new Promise<boolean | undefined>((resolve, reject) => {
        const open = indexedDB.open("tailory");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction("drafts").objectStore("drafts").get("autosave");
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result?.document?.versions?.[0]?.autoFit);
          };
        };
      })
  );
}

async function showForm(page: Page) {
  const editTab = page.getByRole("tab", { name: "Edit" });
  if (await editTab.isVisible()) await editTab.click();
}

test("fit a long version to one page, undo the tightening, and see where it runs over", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(LONG_FIXTURE);
  await createVersion(page, "Acme");

  // No target yet: only the page count.
  await expect(readout(page)).toHaveText("2 pages");
  await page.getByRole("button", { name: "Set a page target" }).click();
  await expect(page.getByRole("group", { name: "Target" })).toContainText("2");
  await expect(readout(page)).toHaveText("2 pages · fits");

  await page.getByRole("button", { name: "One page fewer" }).click();
  await expect(page.getByText("Tightened to fit 1 page")).toBeVisible();
  // It fits: the notice, not the readout, says how.
  await expect(readout(page)).toHaveText("1 page · fits");
  expect(await pdfPages(await exportFromMenu(page, /^PDF of this version/))).toBe(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(/^About \d+ lines over 1 page/)).toBeVisible();
  await expect(readout(page)).toHaveText("2 pages · over");
  expect(await pdfPages(await exportFromMenu(page, /^PDF of this version/))).toBe(2);

  await showPreview(page);
  const mark = page
    .getByRole("document", { name: "Preview of Acme" })
    .getByRole("separator", { name: "Page 2, past the target" });
  await expect(mark).toBeVisible();
  // Nothing is dropped: the last job is still on the page, after the mark.
  await expect(page.getByRole("document", { name: "Preview of Acme" })).toContainText(
    "Led work item 5 at Company D"
  );
  await showForm(page);

  // The undo is remembered for this version after a reload.
  await expect.poll(() => savedAutoFit(page), { timeout: 20_000 }).toBe(false);
  await page.reload();
  await page.getByRole("tab", { name: "Acme" }).click();
  await expect(page.getByText(/^About \d+ lines over 1 page/)).toBeVisible();
  await page.getByRole("button", { name: "Tighten" }).click();
  await expect(page.getByText("Tightened to fit 1 page")).toBeVisible();
});

test("the master has its own target, and no target shows only the page count", async ({ page }) => {
  await page.goto("/editor");
  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(LONG_FIXTURE);

  await expect(readout(page)).toHaveText("2 pages");
  await showPreview(page);
  // Without a target, page breaks are marked but nothing is over.
  await expect(page.getByRole("separator", { name: "Page 2" })).toBeVisible();
  await showForm(page);

  await page.getByRole("button", { name: "Set a page target" }).click();
  await page.getByRole("button", { name: "One page more" }).click();
  await expect(readout(page)).toHaveText("2 pages · fits");
  await page.getByRole("button", { name: "Clear the page target" }).click();
  await expect(readout(page)).toHaveText("2 pages");
  expect(await pdfPages(await exportFromMenu(page, /^PDF of Master/))).toBe(2);
});
