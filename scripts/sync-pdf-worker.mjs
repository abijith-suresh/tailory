import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "node_modules", "pdfjs-dist");
const source = path.join(packageRoot, "build", "pdf.worker.min.mjs");
const destination = path.join(root, "public", "pdf.worker.min.mjs");

const { version } = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));

writeFileSync(destination, readFileSync(source));

console.log(`Synced public/pdf.worker.min.mjs from pdfjs-dist ${version}`);
