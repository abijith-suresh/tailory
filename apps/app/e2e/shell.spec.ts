import { expect, type Page, test } from "@playwright/test";

import { FIRST_RUN, fillProfile } from "./helpers";

/**
 * Pages swap at once and leave nothing behind. After every navigation between the app's pages:
 * the new page's heading is the only one, no text from the last page is left, no dialog, menu or
 * toast is open, and no animation is still running a second later.
 */

type Stop = { name: string; heading: RegExp };

const HOME: Stop = { name: "Applications", heading: /^Applications$/ };
const PROFILE: Stop = { name: "Profile", heading: /^Profile$/ };
const SETTINGS: Stop = { name: "Settings", heading: /^Settings$/ };
const APPLICATION: Stop = { name: "Application", heading: /^Shell check/ };

const main = (page: Page) => page.locator("main#main");

/** Nothing from another page in view, and nothing moving. */
async function expectSettled(page: Page, stop: Stop, previous?: string) {
  const headings = main(page).locator("h1");
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText(stop.heading);
  if (previous && !stop.heading.test(previous)) {
    await expect(main(page).getByRole("heading", { level: 1, name: previous })).toHaveCount(0);
  }

  const leftovers = await page.evaluate(() => ({
    dialogs: document.querySelectorAll("dialog[open]").length,
    popovers: document.querySelectorAll(":popover-open").length,
    toasts: document.querySelectorAll(".toast").length,
    viewTransitions: document.querySelectorAll("[style*='view-transition-name']").length,
  }));
  expect(leftovers).toEqual({ dialogs: 0, popovers: 0, toasts: 0, viewTransitions: 0 });

  // A second in, every finite animation has finished.
  await page.waitForTimeout(1000);
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return animation.playState === "running" && timing?.iterations !== Number.POSITIVE_INFINITY;
      })
      .map((animation) => (animation as CSSAnimation).animationName ?? animation.id)
  );
  expect(running).toEqual([]);
}

async function clickNav(page: Page, name: string) {
  const short = name === "Applications" ? "Apps" : name;
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: new RegExp(`^(${name}|${short})$`) })
    .click();
}

let applicationPath = "";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/");
  // A fresh install shows the first-run screen; a name in the profile brings the board.
  if (await page.getByRole("heading", { name: FIRST_RUN }).isVisible()) {
    await fillProfile(page, "Shell Check");
    await page.goto("/");
  }
  const existing = page.getByRole("link", { name: /Shell check/ }).first();
  if ((await existing.count()) === 0) {
    await page.getByRole("button", { name: "New application" }).click();
    const dialog = page.getByRole("dialog", { name: "New application" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Company")).toBeFocused();
    await dialog.getByLabel("Company").fill("Shell check");
    await dialog.getByLabel("Role").fill("Frontend engineer");
    await dialog.getByRole("button", { name: "Create application" }).click();
    await page.waitForURL(/\/applications\//);
  } else {
    await existing.click();
    await page.waitForURL(/\/applications\//);
  }
  applicationPath = new URL(page.url()).pathname;
  await page.close();
});

test("the header has a skip link, landmarks and the current section", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute("href", "/profile");
  await expect(nav.getByRole("link")).toHaveCount(3);
  await expect(page.getByText("Local mode")).toHaveCount(0);

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("moving between every page leaves nothing behind", async ({ page }, info) => {
  await page.goto("/");
  await expectSettled(page, HOME);

  const sections = [HOME, PROFILE, SETTINGS];
  let here = HOME;
  // Every ordered pair of the main sections.
  for (const from of sections) {
    for (const to of sections) {
      if (from === to) continue;
      if (here !== from) {
        await clickNav(page, from.name);
        await expectSettled(page, from, here.name);
        here = from;
      }
      await clickNav(page, to.name);
      await expectSettled(page, to, from.name);
      here = to;
    }
  }

  // Into an application and out again.
  await clickNav(page, "Applications");
  await expectSettled(page, HOME, here.name);
  await page.locator(`a[href="${applicationPath}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${applicationPath}$`));
  await expectSettled(page, APPLICATION, "Applications");
  await clickNav(page, "Profile");
  await expectSettled(page, PROFILE, "Shell check");

  // Between the Settings pages, which keep the one Settings heading.
  await clickNav(page, "Settings");
  await expectSettled(page, SETTINGS, "Profile");
  for (const name of ["Agents", "Data", "General"]) {
    await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expectSettled(page, SETTINGS);
  }
  await expect(
    page.getByRole("navigation", { name: "Main" }).locator('a[aria-current="page"]')
  ).toHaveAttribute("href", "/settings");

  await page.screenshot({ path: info.outputPath("settings.png"), fullPage: true });
});

test("a dialog closes with Escape, keeps Tab inside, and gives focus back", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "New application" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "New application" });
  await expect(dialog.getByLabel("Company")).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog"));
    expect(inside).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expectSettled(page, HOME);
});

for (const [name, path] of [
  ["applications", "/"],
  ["profile", "/profile"],
  ["settings", "/settings/general"],
  ["agents", "/settings/agents"],
  ["data", "/settings/data"],
] as const) {
  test(`screenshot: ${name}`, async ({ page }, info) => {
    await page.goto(path);
    await expect(main(page).locator("h1")).toHaveCount(1);
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: false });
  });
}

test("screenshot: application", async ({ page }, info) => {
  await page.goto(applicationPath);
  await expect(main(page).locator("h1")).toHaveCount(1);
  await page.waitForTimeout(800);
  await page.screenshot({ path: info.outputPath("application.png") });
});

test("screenshot: new application dialog", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New application" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath("dialog.png") });
});
