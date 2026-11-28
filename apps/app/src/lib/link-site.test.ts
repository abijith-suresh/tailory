import { describe, expect, it } from "vitest";

import { siteFromUrl } from "./link-site";

describe("siteFromUrl", () => {
  it("names well-known sites, with or without the scheme and www", () => {
    expect(siteFromUrl("https://github.com/ada")?.label).toBe("GitHub");
    expect(siteFromUrl("github.com/ada")?.network).toBe("GitHub");
    expect(siteFromUrl("https://www.linkedin.com/in/ada")?.label).toBe("LinkedIn");
    expect(siteFromUrl("https://m.youtube.com/@ada")?.label).toBe("YouTube");
    expect(siteFromUrl("twitter.com/ada")?.label).toBe("X");
    expect(siteFromUrl("https://dribbble.com/ada")).toEqual({
      network: "Dribbble",
      label: "Dribbble",
      known: true,
    });
  });

  it("knows subdomains of a site, and not look-alikes", () => {
    expect(siteFromUrl("ada.substack.com")?.label).toBe("Substack");
    expect(siteFromUrl("https://ada.medium.com/post")?.label).toBe("Medium");
    expect(siteFromUrl("https://notgithub.com/ada")?.label).toBe("Website");
    expect(siteFromUrl("https://github.com.evil.io/ada")?.label).toBe("Website");
  });

  it("calls anything else a website, and says nothing for an empty field", () => {
    expect(siteFromUrl("https://ada.dev")).toEqual({
      network: null,
      label: "Website",
      known: false,
    });
    expect(siteFromUrl("  ")).toBeNull();
    expect(siteFromUrl("hello")?.label).toBe("Link");
    expect(siteFromUrl("mailto:ada@example.com")?.label).toBe("Email");
    expect(siteFromUrl("javascript:alert(1)")?.label).toBe("Link");
  });
});
