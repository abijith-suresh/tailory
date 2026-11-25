// Stage a publishable package whose server deps are bundled into dist/,
// leaving only the two packages that read their own files at runtime.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = process.argv[2] ?? path.join(root, ".pack");
const pkg = (await import(path.join(root, "package.json"), { with: { type: "json" } })).default;
const stage = path.join(out, "stage");
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const dir of pkg.files)
  cpSync(path.join(root, dir), path.join(stage, dir), { recursive: true });
const keep = ["@electric-sql/pglite", "pdfmake"];
writeFileSync(
  path.join(stage, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      version: `${pkg.version}-bundled`,
      type: "module",
      engines: pkg.engines,
      bin: pkg.bin,
      files: pkg.files,
      dependencies: Object.fromEntries(keep.map((k) => [k, pkg.dependencies[k]])),
    },
    null,
    2
  )
);
execFileSync("npm", ["pack", "--pack-destination", out], { cwd: stage, stdio: "inherit" });
