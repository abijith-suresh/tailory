import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  EDITED_LABEL,
  editLabel,
  FIXTURE_NAME,
  importFixtureResume,
  waitForAutosave,
} from "./fixtures/editor";

test("import, edit, restore from autosave, then export PDF and JSON", async ({ page }) => {
  await page.goto("/editor");

  await importFixtureResume(page);
  await editLabel(page);
  await waitForAutosave(page);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(FIXTURE_NAME);
  await expect(page.getByRole("textbox", { name: "Title / Label" })).toHaveValue(EDITED_LABEL);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const json = await jsonDownload;
  expect(json.suggestedFilename()).toBe("Ada_Fixture.json");
  const exported = JSON.parse(await readFile(await json.path(), "utf8"));
  expect(exported.basics).toMatchObject({ name: FIXTURE_NAME, label: EDITED_LABEL });
  expect(exported.work[0]).toMatchObject({ name: "Example Labs" });

  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("Ada_Fixture_resume.pdf");
  const bytes = await readFile(await pdf.path());
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(1_000);
});
