import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("release automation source of truth", () => {
  it("keeps release metadata aligned across package, manifest, and workflow", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      version: string;
      packageManager?: string;
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
      "include-v-in-tag"?: boolean;
      "include-v-in-release-name"?: boolean;
      "initial-version"?: string;
    };
    const workflow = readFileSync(
      path.join(root, ".github", "workflows", "release-please.yml"),
      "utf8"
    );

    expect(config["include-component-in-tag"]).toBe(false);
    expect(config["include-v-in-tag"]).toBe(false);
    expect(config["include-v-in-release-name"]).toBe(false);
    expect(config["bootstrap-sha"]).toBeUndefined();
    expect(config["initial-version"]).toBeUndefined();
    expect(workflow).toContain("abijith-suresh/workflows/.github/workflows/release-please.yml");
    expect(workflow).toContain("RELEASE_PLEASE_TOKEN:");
    expect(workflow).toContain("secrets.RELEASE_PLEASE_TOKEN");

    expect(manifest["."]).toBe(packageJson.version);
    expect(packageJson.version).toBe("0.0.1");

    // Unified CI runtime contract
    expect(existsSync(path.join(root, "mise.toml"))).toBe(true);
    expect(existsSync(path.join(root, ".bun-version"))).toBe(false);
    expect(existsSync(path.join(root, ".node-version"))).toBe(false);
    expect(packageJson.packageManager).toBe("bun@1.4.1");

    const mise = readFileSync(path.join(root, "mise.toml"), "utf8");
    expect(mise).toContain('bun = "1.4.1"');
    expect(mise).toContain('node = "24.20.0"');
  });

  it("documents the maintainer release flow in-repo", () => {
    const docPath = path.join(process.cwd(), "CONTRIBUTING.md");

    expect(existsSync(docPath)).toBe(true);

    const docs = readFileSync(docPath, "utf8");

    expect(docs).toContain("Release Please");
    expect(docs).toContain("package.json");
    expect(docs).toContain(".release-please-manifest.json");
    expect(docs).toContain("CHANGELOG.md");
    expect(docs).toContain("X.Y.Z");
    expect(docs).toContain("0.0.1");
    expect(docs).toContain("RELEASE_PLEASE_TOKEN");
  });
});
