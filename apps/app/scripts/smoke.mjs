// Installs the packed app the way a user would, in an empty folder, and checks that it starts and
// serves pages. Prints sizes and timings; in GitHub Actions they also go to the job summary.
//
//   node apps/app/scripts/smoke.mjs

import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

import { pack } from "./pack.mjs";

const npm = (args, cwd) =>
  execFileSync("npm", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
  });

const check = (condition, message) => {
  if (!condition) throw new Error(`Smoke test failed: ${message}`);
};

const folderSize = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((total, entry) => total + statSync(path.join(entry.parentPath, entry.name)).size, 0);

/** GET with an explicit Host and Origin, which fetch() doesn't let callers set freely. */
const get = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = request(url, { headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });

/** Starts the installed bin and resolves with its URL once it prints one. */
const start = (bin, args) =>
  new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(process.execPath, [bin, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`tailory did not start in 60 s:\n${output}`));
    }, 60_000);
    const onData = (chunk) => {
      output += chunk;
      const match = output.match(/running at (http:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve({ child, url: match[1], ms: performance.now() - started });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`tailory exited with ${code}:\n${output}`));
    });
  });

const stop = (child) =>
  new Promise((resolve) => {
    child.removeAllListeners("exit");
    child.on("exit", (code, signal) => resolve({ code, signal }));
    child.kill("SIGTERM");
  });

/** A resume that runs onto a second page as designed, and fits one page tightened. */
const twoPageResume = () => ({
  basics: {
    name: "Ada Smoke",
    label: "Software Engineer",
    email: "ada@example.com",
    summary: "Builds small, reliable tools that run in the browser.",
    location: {},
    profiles: [],
  },
  work: ["A", "B", "C", "D"].map((company, index) => ({
    id: `work-${company}`,
    name: `Company ${company}`,
    position: "Senior Software Engineer",
    startDate: `${2016 + index * 2}-01`,
    endDate: `${2017 + index * 2}-12`,
    highlights: [1, 2, 3, 4, 5].map((item) => ({
      id: `bullet-${company}${item}`,
      text: `Led work item ${item} at Company ${company}, shipping a faster editor and a calmer review process for the team.`,
    })),
  })),
  education: [{ id: "education-1", institution: "Example University", area: "Computer Science" }],
  skills: [{ id: "skill-1", name: "Languages", keywords: ["TypeScript", "Rust", "Go"] }],
});

const work = mkdtempSync(path.join(tmpdir(), "tailory-smoke-"));
try {
  const tarball = pack();

  const project = path.join(work, "project");
  const dataDir = path.join(work, "data");
  mkdirSync(project);
  writeFileSync(path.join(project, "package.json"), '{ "private": true }\n');

  const installStarted = performance.now();
  // An empty cache, so the timing matches a first `npx tailory` on a new machine.
  const cache = path.join(work, "npm-cache");
  npm(["install", "--no-audit", "--no-fund", "--cache", cache, tarball.file], project);
  const installMs = performance.now() - installStarted;

  const modules = path.join(project, "node_modules");
  const installed = readdirSync(modules).filter((name) => !name.startsWith("."));
  const packages = installed.flatMap((name) =>
    name.startsWith("@") ? readdirSync(path.join(modules, name)).map((n) => `${name}/${n}`) : [name]
  );
  check(
    packages.sort().join(",") === "@electric-sql/pglite,tailory",
    `the installed package should depend on PGlite alone, found ${packages.join(", ")}`
  );

  // The bundled pdfmake fits and prints a resume from the installed package.
  const render = await import(
    pathToFileURL(path.join(modules, "tailory", "dist", "server", "render.js")).href
  );
  const application = {
    excluded: [],
    rewordings: [],
    sectionOrder: [],
    templateId: "modern",
    pageTarget: 1,
    autoFit: true,
  };
  const coldStarted = performance.now();
  const fitted = await render.fitApplicationResult(twoPageResume(), application);
  const pdf = await render.renderPdf(twoPageResume(), application);
  const coldRenderMs = performance.now() - coldStarted;
  const warmStarted = performance.now();
  await render.fitApplicationResult(twoPageResume(), application);
  await render.renderPdf(twoPageResume(), application);
  const warmRenderMs = performance.now() - warmStarted;
  check(
    fitted.page.message === "1 page, fits with tighter spacing",
    `fit said "${fitted.page.message}"`
  );
  const pdfPages = Buffer.from(pdf)
    .toString("latin1")
    .match(/\/Type \/Page\b/g)?.length;
  check(pdfPages === 1, `the fitted PDF has ${pdfPages} pages`);
  const untargeted = await render.fitApplicationResult(twoPageResume(), {
    ...application,
    pageTarget: null,
  });
  check(
    untargeted.page.message === "2 pages",
    `fit without a target said "${untargeted.page.message}"`
  );

  const bin = path.join(modules, "tailory", "bin", "tailory.mjs");
  const args = ["--port", "0", "--data-dir", dataDir];

  const first = await start(bin, args);
  const home = await get(first.url);
  check(home.status === 200, `GET / answered ${home.status}`);
  check(home.body.includes("No applications yet"), "GET / is missing the applications page");
  const health = await get(`${first.url}/healthz`);
  check(health.status === 200, `GET /healthz answered ${health.status}`);
  const missing = await get(`${first.url}/no-such-page`);
  check(missing.status === 404, `GET /no-such-page answered ${missing.status}`);

  // Local mode refuses foreign Host and Origin headers, static files included.
  const asset = home.body.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  check(asset, "the page references no client script");
  check((await get(`${first.url}${asset}`)).status === 200, "the client script isn't served");
  for (const [target, headers] of [
    ["/", { host: "evil.example" }],
    [asset, { host: "evil.example" }],
    ["/", { origin: "http://evil.example" }],
  ]) {
    const { status } = await get(`${first.url}${target}`, headers);
    check(status === 403, `GET ${target} with ${JSON.stringify(headers)} answered ${status}`);
  }

  // An MCP client speaking 2026-07-28 connects with no sign-in and calls a tool.
  const client = new Client(
    { name: "tailory-smoke", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } }
  );
  await client.connect(new StreamableHTTPClientTransport(new URL(`${first.url}/mcp`)));
  const version = client.getNegotiatedProtocolVersion();
  check(version === "2026-07-28", `MCP negotiated ${version}`);
  const { tools } = await client.listTools();
  check(
    tools.some((tool) => tool.name === "whoami"),
    "MCP lists no whoami tool"
  );
  const whoami = await client.callTool({ name: "whoami", arguments: {} });
  check(whoami.content[0].text.includes('"mode":"local"'), "whoami didn't answer for local mode");
  await client.close();

  // A second process can't open the same data folder.
  const second = spawn(process.execPath, [bin, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let secondError = "";
  second.stderr.on("data", (chunk) => {
    secondError += chunk;
  });
  const secondCode = await new Promise((resolve) => second.on("exit", resolve));
  check(secondCode === 1, `a second process on the same data folder exited with ${secondCode}`);
  check(secondError.includes("Another Tailory"), `unexpected lock message: ${secondError}`);

  await stop(first.child);
  check(!existsSync(path.join(dataDir, "tailory.lock")), "stopping left the lock file behind");

  const warm = await start(bin, args);
  await stop(warm.child);

  const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
  const s = (ms) => `${(ms / 1000).toFixed(1)} s`;
  const summary = [
    "### Packed app smoke test",
    "",
    "| Measure | Value |",
    "| --- | --- |",
    `| Tarball (packed / unpacked) | ${mb(tarball.size)} / ${mb(tarball.unpackedSize)} |`,
    `| Installed node_modules | ${mb(folderSize(modules))} |`,
    `| Installed packages | ${packages.join(", ")} |`,
    `| npm install (empty cache) | ${s(installMs)} |`,
    `| First start (creates and migrates the database) | ${s(first.ms)} |`,
    `| Warm start | ${s(warm.ms)} |`,
    `| Fit and print a two-page resume to one page (first, then warm) | ${s(coldRenderMs)}, ${s(warmRenderMs)} |`,
    "",
  ].join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log("Smoke test passed.");
} finally {
  rmSync(work, { recursive: true, force: true });
}
