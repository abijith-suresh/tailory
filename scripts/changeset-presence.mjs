// Requires a Changeset on pull requests that change a versioned workspace package.
//
// Every workspace package is versioned by Changesets (see .changeset/config.json). A pull request
// that changes a package's shipped files must add a patch Changeset naming that package. Tests,
// READMEs, and generated changelogs do not count as shipped files. Pull requests whose
// Conventional Commit type is docs, ci, chore, style, or test are exempt, and CI skips the
// generated "version packages" pull request.
//
// In CI: BASE_SHA, HEAD_SHA, and PR_TITLE come from the pull_request event.
// Locally: node scripts/changeset-presence.mjs (compares HEAD^ with HEAD).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import parseChangesetFile from "@changesets/parse";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

/** Workspace directories whose packages Changesets versions. */
export const versionedPackageDirs = ["apps/app", "apps/site", "packages/core"];

/** Conventional Commit types that never need a Changeset. */
export const exemptTitleTypes = ["docs", "ci", "chore", "style", "test"];

const requiredBump = "patch";
const changesetPathPattern = /^\.changeset\/(?!README\.md$)[^/.][^/]*\.md$/i;
const titleTypePattern = /^([a-z]+)(?:\([^)]*\))?!?:/;

export const titleType = (title) => titleTypePattern.exec(title ?? "")?.[1];

/** True when a path inside a package directory ships with that package. */
export const isReleasablePath = (path) => {
  const normalized = path.replaceAll("\\", "/");
  const name = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (name === "CHANGELOG.md" || name === "README.md") return false;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(name)) return false;
  if (/(^|\/)(tests?|e2e|coverage|dist)\//.test(normalized)) return false;
  return true;
};

const runGit = (root, args) => {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args[0]} failed.`);
  }
  return result.stdout;
};

const readChangedFiles = ({ root, baseSha, headSha }) => {
  const range =
    baseSha === undefined || headSha === undefined
      ? ["HEAD^", "HEAD"]
      : [`${baseSha}...${headSha}`];
  return runGit(root, ["diff", "--name-only", "--no-renames", ...range])
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
};

const readJson = (root, path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

const parseChangeset = (file, contents) => {
  try {
    return parseChangesetFile(contents).releases.map(({ name, type }) => ({
      file,
      packageName: name,
      bump: type,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${file}: ${message}`, { cause: error });
  }
};

/**
 * Decide whether the changed files need Changesets and whether the PR has them.
 *
 * `readChangeset(file)` returns a changed Changeset's contents, or undefined when the PR deleted it.
 */
export const checkChangesetPresence = ({
  root = repositoryRoot,
  changedFiles,
  title,
  readChangeset,
}) => {
  const type = titleType(title);
  if (type !== undefined && exemptTitleTypes.includes(type)) {
    return { exempt: type, missing: [] };
  }

  const packages = versionedPackageDirs.map((dir) => ({
    dir,
    name: readJson(root, `${dir}/package.json`).name,
    files: changedFiles.filter((file) => file.startsWith(`${dir}/`) && isReleasablePath(file)),
  }));

  const changesets = changedFiles
    .filter((file) => changesetPathPattern.test(file))
    .flatMap((file) => {
      const contents = readChangeset(file);
      return contents === undefined ? [] : parseChangeset(file, contents);
    });

  const missing = packages.filter(
    (pkg) =>
      pkg.files.length > 0 &&
      !changesets.some((change) => change.packageName === pkg.name && change.bump === requiredBump)
  );

  return { packages, changesets, missing };
};

const run = () => {
  const root = process.cwd();
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const ref = headSha ?? "HEAD";
  const result = checkChangesetPresence({
    root,
    changedFiles: readChangedFiles({ root, baseSha, headSha }),
    title: process.env.PR_TITLE,
    readChangeset: (file) => {
      const listed = runGit(root, ["ls-tree", "--name-only", ref, "--", file]).trim();
      return listed === "" ? undefined : runGit(root, ["show", `${ref}:${file}`]);
    },
  });

  if (result.exempt !== undefined) {
    process.stdout.write(`Changeset check skipped: "${result.exempt}" pull requests are exempt.\n`);
    return;
  }
  if (result.missing.length === 0) {
    process.stdout.write("Changeset check passed.\n");
    return;
  }

  const lines = ["Changeset check failed: these packages changed without a patch Changeset."];
  for (const pkg of result.missing) {
    lines.push("", `${pkg.name} (${pkg.dir}):`, ...pkg.files.map((file) => `  - ${file}`));
  }
  lines.push(
    "",
    "Run `npx changeset`, pick each package above, leave the bump at patch, and commit the file it writes."
  );
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exitCode = 1;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Changeset check failed closed: ${message}\n`);
    process.exitCode = 1;
  }
}
