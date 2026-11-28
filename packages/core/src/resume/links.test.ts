import { describe, expect, it } from "vitest";
import { EMPTY_RESUME, type ResumeSchema } from "../types/resume.ts";
import { inferProfileLink } from "./links.ts";
import { normalizeResume } from "./normalize.ts";

describe("inferProfileLink", () => {
  it.each([
    ["https://github.com/jane", "GitHub", "jane"],
    ["https://www.linkedin.com/in/jane-doe/", "LinkedIn", "jane-doe"],
    ["https://x.com/jane", "X", "jane"],
    ["https://twitter.com/jane", "X", "jane"],
    ["https://gitlab.com/jane", "GitLab", "jane"],
    ["https://dribbble.com/jane", "Dribbble", "jane"],
    ["https://www.behance.net/jane", "Behance", "jane"],
    ["https://mastodon.social/@jane", "Mastodon", "jane"],
    ["https://hachyderm.io/@jane", "Mastodon", "jane"],
    ["github.com/jane", "GitHub", "jane"],
  ])("reads %s as %s", (url, network, username) => {
    expect(inferProfileLink(url)).toEqual({ network, username });
  });

  it("knows the site even when the path holds no username", () => {
    expect(inferProfileLink("https://github.com/jane/tailory")).toEqual({
      network: "GitHub",
      username: "",
    });
  });

  it("knows nothing of other sites", () => {
    expect(inferProfileLink("https://jane.example/about")).toBeNull();
    expect(inferProfileLink("https://notgithub.com/jane")).toBeNull();
    expect(inferProfileLink("not a url at all")).toBeNull();
  });
});

describe("profile links in a normalized resume", () => {
  const withLinks = (profiles: unknown[]): ResumeSchema =>
    normalizeResume({
      ...structuredClone(EMPTY_RESUME),
      basics: { ...structuredClone(EMPTY_RESUME).basics, name: "Jane", profiles } as never,
    });

  it("names the site from the URL, and gives each link an id", () => {
    const [github, site, blog] =
      withLinks([
        { url: "https://github.com/jane", network: "" },
        { url: "https://jane.example" },
        { url: "https://jane.example/blog", network: "Blog" },
      ]).basics.profiles ?? [];
    expect(github).toMatchObject({ network: "GitHub", username: "jane" });
    expect(site).toMatchObject({ network: "Website", username: "" });
    expect(blog).toMatchObject({ network: "Blog" });
    expect(github?.id).toMatch(/\S/);
    expect(new Set([github?.id, site?.id, blog?.id]).size).toBe(3);
  });

  it("follows the URL when it moves to another site, and keeps ids and usernames given", () => {
    const [link] =
      withLinks([
        { id: "link-1", url: "https://linkedin.com/in/jane", network: "GitHub", username: "jd" },
      ]).basics.profiles ?? [];
    expect(link).toEqual({
      id: "link-1",
      network: "LinkedIn",
      username: "jd",
      url: "https://linkedin.com/in/jane",
    });
  });
});
