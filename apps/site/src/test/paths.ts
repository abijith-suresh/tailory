import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The `@tailory/site` workspace directory (holds `public/` and `src/`). */
export const siteRoot = path.resolve(here, "..", "..");

/** The repository root: the nearest ancestor whose package.json declares npm workspaces. */
export const repoRoot = findRepoRoot(siteRoot);

/** Where Node resolves an installed package from the site, wherever npm placed it. */
export function packageDir(name: string): string {
  const require = createRequire(path.join(siteRoot, "package.json"));
  return path.dirname(require.resolve(`${name}/package.json`));
}

function findRepoRoot(start: string): string {
  let dir = start;
  while (true) {
    const manifest = path.join(dir, "package.json");
    if (existsSync(manifest)) {
      const { workspaces } = JSON.parse(readFileSync(manifest, "utf8")) as { workspaces?: unknown };
      if (workspaces) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No workspace root above ${start}`);
    dir = parent;
  }
}
