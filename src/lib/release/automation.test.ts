import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("release automation source of truth", () => {
  it("keeps release metadata aligned across package, manifest, workflow, and changelog", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      version: string;
    };
    const manifest = JSON.parse(
      readFileSync(path.join(root, ".release-please-manifest.json"), "utf8")
    ) as Record<string, string>;
    const config = JSON.parse(
      readFileSync(path.join(root, "release-please-config.json"), "utf8")
    ) as {
      [key: string]: unknown;
      "bootstrap-sha"?: string;
      "include-component-in-tag"?: boolean;
    };
    const workflow = readFileSync(
      path.join(root, ".github", "workflows", "release-please.yml"),
      "utf8"
    );
    const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");

    expect(manifest["."]).toBe(packageJson.version);
    expect(config["include-component-in-tag"]).toBe(false);
    expect(config["bootstrap-sha"]).toMatch(/^[0-9a-f]{40}$/u);
    expect(workflow).toContain("config-file: release-please-config.json");
    expect(workflow).toContain("manifest-file: .release-please-manifest.json");
    expect(changelog).toContain(
      `[unreleased]: https://github.com/abijith-suresh/tailory/compare/v${packageJson.version}...HEAD`
    );
  });

  it("documents the maintainer release flow in-repo", () => {
    const docPath = path.join(process.cwd(), "docs", "releases.md");

    expect(existsSync(docPath)).toBe(true);

    const docs = readFileSync(docPath, "utf8");

    expect(docs).toContain("Release Please");
    expect(docs).toContain("package.json");
    expect(docs).toContain(".release-please-manifest.json");
    expect(docs).toContain("CHANGELOG.md");
    expect(docs).toContain("vX.Y.Z");
    expect(docs).toContain("RELEASE_PLEASE_TOKEN");
  });
});
