import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  EDITED_LABEL,
  EXTRA_FIELDS_FIXTURE,
  editLabel,
  FIXTURE_NAME,
  importFixtureResume,
  seedVersion1Autosave,
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

test("import a JSON Resume with fields Tailory does not use and see which were skipped", async ({
  page,
}) => {
  await page.goto("/editor");

  await page.getByLabel("Import resume file", { exact: true }).setInputFiles(EXTRA_FIELDS_FIXTURE);

  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(FIXTURE_NAME);
  await expect(
    page.getByRole("status").filter({ hasText: "Tailory doesn't use these fields" })
  ).toHaveText(
    "Tailory doesn't use these fields, so they weren't imported: $schema, meta, custom."
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("open a resume saved before versions existed and keep editing it", async ({ page }) => {
  await page.goto("/");
  await seedVersion1Autosave(page, FIXTURE_NAME);

  await page.goto("/editor");
  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(FIXTURE_NAME);
  await expect(page.getByRole("textbox", { name: "Title / Label" })).toHaveValue(
    "Saved before versions"
  );

  await editLabel(page);
  await waitForAutosave(page);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const exported = JSON.parse(await readFile(await (await jsonDownload).path(), "utf8"));
  expect(exported.work[0].highlights).toEqual(["Kept through the upgrade"]);
});
