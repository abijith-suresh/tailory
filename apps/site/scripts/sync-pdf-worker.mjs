import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// npm workspaces may hoist pdfjs-dist above this package, so ask Node where it is.
const require = createRequire(path.join(root, "package.json"));
const packageRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const source = path.join(packageRoot, "build", "pdf.worker.min.mjs");
const destination = path.join(root, "public", "pdf.worker.min.mjs");

const { version } = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));

writeFileSync(destination, readFileSync(source));

console.log(`Synced public/pdf.worker.min.mjs from pdfjs-dist ${version}`);
