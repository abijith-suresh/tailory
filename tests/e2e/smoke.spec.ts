import { expect, test } from "@playwright/test";

test("home page renders the hero", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Tailory · The resume editor that stays in your browser");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText("The resume editor that stays in your browser.");
  await expect(
    page.getByRole("img", { name: /sample resume in the Modern template/ })
  ).toBeVisible();
});

for (const path of ["/faq", "/privacy"]) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("unknown routes show the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn’t here.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("GitHub links sit in the footer, not the header", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("navigation", { name: "Main" });
  await expect(header.getByRole("link", { name: "FAQ" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(header.getByRole("link", { name: /GitHub/ })).toHaveCount(0);

  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await expect(footer.getByRole("link", { name: /Report an issue/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Releases/ })).toHaveCount(0);
});
