import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  EDITED_LABEL,
  EXTRA_FIELDS_FIXTURE,
  editLabel,
  exportFromMenu,
  FIXTURE_NAME,
  importFixtureResume,
  readJsonDownload,
  seedVersion1Autosave,
  waitForAutosave,
} from "./fixtures/editor";

test("import, edit, restore from autosave, then export PDF and JSON", async ({ page }) => {
  await page.goto("/editor");

  await importFixtureResume(page);
  await editLabel(page);
  await waitForAutosave(page);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(FIXTURE_NAME);
  await expect(page.getByRole("textbox", { name: "Headline" })).toHaveValue(EDITED_LABEL);
  await expect(page.getByTestId("save-status")).toHaveText("Saved in this browser");

  const json = await exportFromMenu(page, /^JSON Resume of Master/);
  expect(json.suggestedFilename()).toBe("Ada_Fixture.json");
  const exported = await readJsonDownload(json);
  expect(exported.basics).toMatchObject({ name: FIXTURE_NAME, label: EDITED_LABEL });
  expect(exported.work[0]).toMatchObject({ name: "Example Labs" });

  const pdf = await exportFromMenu(page, /^PDF of Master/);
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
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(FIXTURE_NAME);
  await expect(page.getByRole("textbox", { name: "Headline" })).toHaveValue(
    "Saved before versions"
  );

  await editLabel(page);
  await waitForAutosave(page);

  const exported = await readJsonDownload(await exportFromMenu(page, /^JSON Resume of Master/));
  expect(exported.work[0].highlights).toEqual(["Kept through the upgrade"]);
});

test("on a 320px screen the editor fits, and versions and export stay in reach", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/editor");
  await importFixtureResume(page);

  await expect(page.getByRole("button", { name: "Export" })).toBeInViewport();
  await expect(page.getByRole("tab", { name: "Master" })).toBeInViewport();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "New version" })
  ).toBeInViewport();
  await expect(page.getByRole("tab", { name: "Preview" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  const box = await page.getByRole("button", { name: "Export" }).boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("document", { name: "Preview of Master" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
