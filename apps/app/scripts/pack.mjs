// Builds the app and packs it into apps/app/.pack/tailory-<version>.tgz: the one artifact that
// both `npm install -g` / `npx` and the Docker image install.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const appRoot = fileURLToPath(new URL("..", import.meta.url));
export const packDir = path.join(appRoot, ".pack");

const npm = (args, stdout) =>
  execFileSync("npm", args, {
    cwd: appRoot,
    encoding: "utf8",
    stdio: ["ignore", stdout, "inherit"],
    shell: process.platform === "win32",
  });

/** Builds and packs the app, and returns the tarball's details. */
export const pack = () => {
  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  npm(["run", "build"], "inherit");
  // The build already ran; skipping prepack keeps the JSON report alone on stdout.
  const output = npm(["pack", "--json", "--ignore-scripts", "--pack-destination", packDir], "pipe");
  // npm 11 prints an array of reports; npm 12 prints an object keyed by package name.
  const report = JSON.parse(output);
  const [info] = Array.isArray(report) ? report : Object.values(report);
  return {
    file: path.join(packDir, info.filename),
    size: info.size,
    unpackedSize: info.unpackedSize,
    entryCount: info.entryCount,
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { file, size, unpackedSize } = pack();
  console.log(
    `${path.relative(process.cwd(), file)}: ${(size / 1e6).toFixed(2)} MB packed, ${(unpackedSize / 1e6).toFixed(2)} MB unpacked`
  );
}
