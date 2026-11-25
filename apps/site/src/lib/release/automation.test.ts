import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { repoRoot } from "@/test/paths";

const read = (...segments: string[]) => readFileSync(path.join(repoRoot, ...segments), "utf8");
const readJson = <T>(...segments: string[]) => JSON.parse(read(...segments)) as T;

describe("release automation source of truth", () => {
  it("versions every workspace package with Changesets and does not publish", () => {
    const config = readJson<{
      baseBranch: string;
      ignore: string[];
      privatePackages: { version: boolean; tag: boolean };
    }>(".changeset", "config.json");

    expect(config.baseBranch).toBe("main");
    expect(config.ignore).toEqual([]);
    expect(config.privatePackages).toEqual({ version: true, tag: true });

    for (const dir of ["apps/app", "apps/site", "packages/core"]) {
      const pkg = readJson<{ private?: boolean; version?: string }>(dir, "package.json");
      expect(pkg.private, dir).toBe(true);
      expect(pkg.version, dir).toMatch(/^\d+\.\d+\.\d+$/);
    }

    const workflow = read(".github", "workflows", "release.yml");
    expect(workflow).toMatch(/uses: changesets\/action@[0-9a-f]{40} # v\d/);
    expect(workflow).toContain("version-script: npm run version-packages");
    expect(workflow).toContain("secrets.RELEASE_TOKEN");
    expect(workflow).not.toContain("publish-script");
    expect(workflow).not.toContain("NPM_TOKEN");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
  });

  it("requires a Changeset in CI and keeps it in the gate", () => {
    const ci = read(".github", "workflows", "ci.yml");
    expect(ci).toContain("run: npm run changeset:check");
    expect(ci).toMatch(/needs: \[[^\]]*\bchangeset\b[^\]]*\]/);
  });

  it("leaves no Release Please configuration behind", () => {
    for (const file of [
      "release-please-config.json",
      ".release-please-manifest.json",
      ".github/workflows/release-please.yml",
      "CHANGELOG.md",
    ]) {
      expect(existsSync(path.join(repoRoot, file)), file).toBe(false);
    }
    expect(existsSync(path.join(repoRoot, "apps", "site", "CHANGELOG.md"))).toBe(true);
    expect(readJson<{ version?: string }>("package.json").version).toBeUndefined();
  });

  it("keeps the Node and npm toolchain in one place", () => {
    const packageJson = readJson<{ packageManager?: string }>("package.json");
    expect(existsSync(path.join(repoRoot, "mise.toml"))).toBe(true);
    expect(existsSync(path.join(repoRoot, ".bun-version"))).toBe(false);
    expect(existsSync(path.join(repoRoot, ".node-version"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "bun.lock"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "package-lock.json"))).toBe(true);
    expect(packageJson.packageManager).toBe("npm@11.16.0");

    const mise = read("mise.toml");
    expect(mise).not.toContain("bun");
    expect(mise).toContain('node = "24.20.0"');
    expect(mise).toContain('npm = "11.16.0"');
  });

  it("documents adding a Changeset in-repo", () => {
    const docs = read("CONTRIBUTING.md");
    expect(docs).toContain("npx changeset");
    expect(docs).not.toContain("Release Please");
  });
});
