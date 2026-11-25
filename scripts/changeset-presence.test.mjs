import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkChangesetPresence, isReleasablePath, titleType } from "./changeset-presence.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const changeset = (entries) =>
  `---\n${Object.entries(entries)
    .map(([name, bump]) => `"${name}": ${bump}`)
    .join("\n")}\n---\n\nA change.\n`;

const check = (changedFiles, changesets = {}, title = "fix: something") =>
  checkChangesetPresence({
    root,
    changedFiles,
    title,
    readChangeset: (file) => changesets[file],
  });

const missingNames = (result) => result.missing.map((pkg) => pkg.name);

test("requires a patch Changeset for each changed package", () => {
  const result = check(["apps/app/src/main.ts", "apps/site/src/pages/index.astro"]);
  assert.deepEqual(missingNames(result), ["tailory", "@tailory/site"]);
});

test("passes when each changed package has a patch Changeset", () => {
  const result = check(["apps/app/src/main.ts", "packages/core/src/index.ts", ".changeset/a.md"], {
    ".changeset/a.md": changeset({ tailory: "patch", "@tailory/core": "patch" }),
  });
  assert.deepEqual(result.missing, []);
});

test("a Changeset for another package or bump does not count", () => {
  const result = check(["apps/app/src/main.ts", ".changeset/a.md", ".changeset/b.md"], {
    ".changeset/a.md": changeset({ "@tailory/site": "patch" }),
    ".changeset/b.md": changeset({ tailory: "minor" }),
  });
  assert.deepEqual(missingNames(result), ["tailory"]);
});

test("a deleted Changeset does not count", () => {
  const result = check(["apps/app/src/main.ts", ".changeset/gone.md"]);
  assert.deepEqual(missingNames(result), ["tailory"]);
});

test("ignores tests, READMEs, changelogs, and files outside packages", () => {
  const result = check([
    "apps/app/src/middleware.test.ts",
    "apps/site/tests/editor.spec.ts",
    "apps/site/src/test/setup.ts",
    "apps/site/CHANGELOG.md",
    "apps/app/README.md",
    "README.md",
    ".github/workflows/ci.yml",
    "package-lock.json",
  ]);
  assert.deepEqual(result.missing, []);
});

test("exempts docs, ci, chore, style, and test pull requests", () => {
  for (const title of ["docs: x", "ci(release): x", "chore(deps): x", "style: x", "test!: x"]) {
    const result = check(["apps/app/src/main.ts"], {}, title);
    assert.equal(result.exempt, titleType(title));
  }
  assert.deepEqual(missingNames(check(["apps/app/src/main.ts"], {}, "feat(app): x")), ["tailory"]);
});

test("fails closed on a malformed Changeset", () => {
  assert.throws(
    () => check(["apps/app/src/main.ts", ".changeset/bad.md"], { ".changeset/bad.md": "nope" }),
    /Could not parse \.changeset\/bad\.md/
  );
});

test("classifies paths", () => {
  assert.equal(isReleasablePath("apps/app/package.json"), true);
  assert.equal(isReleasablePath("apps/app/drizzle/0000_init.sql"), true);
  assert.equal(isReleasablePath("packages/core/src/parser/parse.test.ts"), false);
});
