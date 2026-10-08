import { expect, test } from "@playwright/test";

test("home page renders the hero", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Tailory — Resume editor that belongs to you");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText("The resume editor that belongs to you.");
});
