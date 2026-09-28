import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const workerPath = path.join(root, "public", "pdf.worker.min.mjs");
const sourcePath = path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const pdfModulePath = path.join(root, "src", "lib", "extraction", "pdf.ts");

function readPdfjsVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(path.join(root, "node_modules", "pdfjs-dist", "package.json"), "utf8")
  ) as { version: string };

  return packageJson.version;
}

describe("pdf worker asset", () => {
  it("matches the installed pdfjs-dist build", () => {
    const worker = readFileSync(workerPath);
    const source = readFileSync(sourcePath);

    expect(worker.byteLength).toBeGreaterThan(0);
    expect(worker.equals(source)).toBe(true);
  });

  it("carries the installed pdfjs-dist version", () => {
    const worker = readFileSync(workerPath, "utf8");

    expect(worker).toContain(`"${readPdfjsVersion()}"`);
  });

  it("points GlobalWorkerOptions at the public worker path", () => {
    const pdfModule = readFileSync(pdfModulePath, "utf8");

    expect(pdfModule).toContain('GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"');
  });
});
