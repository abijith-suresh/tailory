import { expect, test } from "@playwright/test";

test("home page renders the hero", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Tailory · Cut your resume to fit the job");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText("Cut your resume to fit the job.");
  await expect(
    page.getByRole("img", { name: /sample resume in the Modern template/ })
  ).toBeVisible();
});

test("both hero actions open the editor", async ({ page }) => {
  await page.goto("/");

  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Open editor" })).toHaveAttribute("href", "/editor");
  await expect(main.getByRole("link", { name: /Import a resume/ })).toHaveAttribute(
    "href",
    "/editor"
  );
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

test("the header keeps FAQ and Privacy; GitHub links sit in the footer", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("navigation", { name: "Main" });
  await expect(header.getByRole("link", { name: "FAQ" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(header.getByRole("link", { name: /GitHub/ })).toHaveCount(0);

  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await expect(footer.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await expect(footer.getByRole("link", { name: /Report an issue/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Releases/ })).toHaveCount(0);
});

test("on phones the header shows only the logo and the editor link", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  const header = page.getByRole("navigation", { name: "Main" });
  await expect(header.getByRole("link", { name: "Tailory home" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Open editor" })).toBeVisible();
  await expect(header.getByRole("link", { name: "FAQ" })).toBeHidden();
  await expect(header.getByRole("link", { name: "Privacy" })).toBeHidden();

  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "FAQ" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
