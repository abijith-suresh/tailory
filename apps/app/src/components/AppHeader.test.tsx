import { describe, expect, it } from "vitest";

import { AppHeader, type Viewer } from "./AppHeader";
import { isCurrent } from "./nav";
import { renderHtml } from "./render.testing";

const signedIn: Viewer = { name: "Ada Lovelace", email: "ada@example.com", mode: "server" };
const local: Viewer = { name: "Local user", email: "local@tailory.invalid", mode: "local" };

const render = (props: Parameters<typeof AppHeader>[0]) =>
  renderHtml(() => <AppHeader {...props} />);

const currentLinks = (doc: Document) =>
  [...doc.querySelectorAll('nav a[aria-current="page"]')].map((a) => a.textContent);

describe("AppHeader", () => {
  it("marks the section you are in as the current page, and only that one", () => {
    expect(currentLinks(render({ pathname: "/", viewer: signedIn }))).toEqual(["Applications"]);
    expect(currentLinks(render({ pathname: "/profile", viewer: signedIn }))).toEqual(["Profile"]);
    expect(currentLinks(render({ pathname: "/connect", viewer: signedIn }))).toEqual([
      "Connect an agent",
    ]);
    expect(currentLinks(render({ pathname: "/settings", viewer: signedIn }))).toEqual(["Settings"]);
    expect(currentLinks(render({ pathname: "/no-such-page", viewer: signedIn }))).toEqual([]);
  });

  it("labels the navigation landmark", () => {
    const nav = render({ pathname: "/" }).querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Main");
    expect([...(nav?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual([
      "/",
      "/profile",
      "/connect",
      "/settings",
    ]);
  });

  it("offers sign-out to a signed-in account", () => {
    const doc = render({ pathname: "/", viewer: signedIn });
    const menu = doc.querySelector("#account-menu");
    expect(menu?.getAttribute("popover")).toBe("auto");
    expect(menu?.textContent).toContain("ada@example.com");
    expect([...(menu?.querySelectorAll("button") ?? [])].map((b) => b.textContent)).toEqual([
      "Sign out",
    ]);
    expect(doc.querySelector('[popovertarget="account-menu"]')?.getAttribute("aria-label")).toBe(
      "Account: Ada Lovelace"
    );
  });

  it("hides the account menu and sign-out in local mode", () => {
    const doc = render({ pathname: "/", viewer: local });
    expect(doc.querySelector("#account-menu")).toBeNull();
    expect(doc.body.textContent).not.toContain("Sign out");
    expect(doc.body.textContent).toContain("Local mode");
  });

  it("shows no account controls before it knows who is signed in", () => {
    const doc = render({ pathname: "/" });
    expect(doc.querySelector("#account-menu")).toBeNull();
    expect(doc.body.textContent).not.toContain("Local mode");
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
  });
});
