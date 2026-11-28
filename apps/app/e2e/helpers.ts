import { expect, type Page } from "@playwright/test";

/** Leaves the first-run screen: types a name into the profile and waits until it has saved. */
export async function fillProfile(page: Page, name: string) {
  await page.goto("/profile");
  const saved = page.waitForResponse(
    (response) => response.url().includes("/_server") && response.request().method() === "POST",
    {
      timeout: 10_000,
    }
  );
  await page.getByLabel("Name", { exact: true }).first().fill(name);
  await saved;
  await expect(page.getByText("All changes saved")).toBeVisible();
}

export const FIRST_RUN = "Let's get your resume in";
