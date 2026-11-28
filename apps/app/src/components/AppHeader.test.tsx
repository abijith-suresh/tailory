import { describe, expect, it } from "vitest";

import { AppHeader, type Viewer } from "./AppHeader";
import { isCurrent } from "./nav";
import { renderHtml } from "./render.testing";

const signedIn: Viewer = { name: "Ada Lovelace", email: "ada@example.com", mode: "server" };
const local: Viewer = { name: "Local user", email: "local@tailory.invalid", mode: "local" };

const render = (props: Parameters<typeof AppHeader>[0]) =>
  renderHtml(() => <AppHeader {...props} />);

const label = (a: Element) => a.querySelector(".app-nav__long")?.textContent;
const currentLinks = (doc: Document) =>
  [...doc.querySelectorAll('nav a[aria-current="page"]')].map(label);

describe("AppHeader", () => {
  it("marks the section you are in as the current page, and only that one", () => {
    expect(currentLinks(render({ pathname: "/", viewer: signedIn }))).toEqual(["Applications"]);
    expect(currentLinks(render({ pathname: "/profile", viewer: signedIn }))).toEqual(["Profile"]);
    expect(currentLinks(render({ pathname: "/applications/a1", viewer: signedIn }))).toEqual([
      "Applications",
    ]);
    expect(currentLinks(render({ pathname: "/settings/agents", viewer: signedIn }))).toEqual([
      "Settings",
    ]);
    expect(currentLinks(render({ pathname: "/settings", viewer: signedIn }))).toEqual(["Settings"]);
    expect(currentLinks(render({ pathname: "/no-such-page", viewer: signedIn }))).toEqual([]);
  });

  it("has the three main sections, with short labels for phones", () => {
    const doc = render({ pathname: "/" });
    expect(doc.querySelector("header")).not.toBeNull();
    const nav = doc.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Main");
    const links = [...(nav?.querySelectorAll("a") ?? [])];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/profile", "/settings"]);
    expect(links.map(label)).toEqual(["Applications", "Profile", "Settings"]);
    expect(links[0].querySelector(".app-nav__short")?.textContent).toBe("Apps");
    // Every other link says it isn't current, so the router never marks one by its address.
    expect(links.slice(1).map((a) => a.getAttribute("aria-current"))).toEqual(["false", "false"]);
  });

  it("offers sign-out to a signed-in account in server mode", () => {
    const doc = render({ pathname: "/", viewer: signedIn });
    const menu = doc.querySelector('[role="menu"]');
    expect(menu?.getAttribute("popover")).toBe("auto");
    expect(menu?.textContent).toContain("ada@example.com");
    expect(
      [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map((b) => b.textContent)
    ).toEqual(["Sign out"]);
    const trigger = doc.querySelector('[aria-haspopup="menu"]');
    expect(trigger?.getAttribute("aria-label")).toBe("Account: Ada Lovelace");
    expect(trigger?.getAttribute("aria-controls")).toBe(menu?.id);
  });

  it("has no account menu, and no mode label, in local mode", () => {
    const doc = render({ pathname: "/", viewer: local });
    expect(doc.querySelector('[role="menu"]')).toBeNull();
    expect(doc.body.textContent).not.toContain("Sign out");
    expect(doc.body.textContent).not.toContain("Local mode");
  });

  it("shows no account controls before it knows who is signed in", () => {
    const doc = render({ pathname: "/" });
    expect(doc.querySelector('[role="menu"]')).toBeNull();
  });

  it("shows only the wordmark on bare pages", () => {
    const doc = render({ pathname: "/sign-in", bare: true });
    expect(doc.querySelector("nav")).toBeNull();
    expect(doc.querySelector("header a")?.getAttribute("href")).toBe("/");
  });
});

describe("isCurrent", () => {
  it("gives Applications the pages under /applications", () => {
    expect(isCurrent("/", "/applications/abc")).toBe(true);
    expect(isCurrent("/", "/profile")).toBe(false);
    expect(isCurrent("/settings", "/settings/account")).toBe(true);
    expect(isCurrent("/settings", "/settingsx")).toBe(false);
    expect(isCurrent("/", "/applications")).toBe(false);
  });
});
