import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { repoRoot } from "@/test/paths";

const read = (...segments: string[]) => readFileSync(path.join(repoRoot, ...segments), "utf8");
const readJson = <T>(...segments: string[]) => JSON.parse(read(...segments)) as T;

describe("release automation source of truth", () => {
  it("versions every workspace package with Changesets and keeps all but the app private", () => {
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
      expect(pkg.private, dir).toBe(dir === "apps/app" ? undefined : true);
      expect(pkg.version, dir).toMatch(/^\d+\.\d+\.\d+$/);
    }
    expect(existsSync(path.join(repoRoot, ".github", "workflows", "release.yml"))).toBe(false);
  });

  it("publishes the app only as dev builds, from CI", () => {
    const pkg = readJson<{
      publishConfig?: { tag?: string; provenance?: boolean };
      scripts: Record<string, string>;
    }>("apps", "app", "package.json");
    expect(pkg.publishConfig?.tag).toBe("dev");
    expect(pkg.publishConfig?.provenance).toBe(true);
    expect(pkg.scripts.prepublishOnly).toContain("process.exit(1)");

    const workflow = read(".github", "workflows", "dev-build.yml");
    expect(workflow).toContain("npm run test:smoke --workspace tailory");
    expect(workflow).toMatch(/npm publish "\$RUNNER_TEMP\/pack\/tailory-\$VERSION\.tgz" --tag dev/);
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("vars.NPM_TRUSTED_PUBLISHING");
    expect(workflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
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
    expect(packageJson.packageManager).toBe("npm@11.21.3");

    const mise = read("mise.toml");
    expect(mise).not.toContain("bun");
    expect(mise).toContain('node = "24.20.0"');
    expect(mise).toContain('npm = "11.21.3"');
  });

  it("documents adding a Changeset in-repo", () => {
    const docs = read("CONTRIBUTING.md");
    expect(docs).toContain("npx changeset");
    expect(docs).not.toContain("Release Please");
  });
});
