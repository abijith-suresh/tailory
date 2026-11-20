import { type BrowserContext, expect, type Request, test } from "@playwright/test";
import {
  EDITED_LABEL,
  editLabel,
  importFixtureResume,
  removeNavigatorShare,
  waitForAutosave,
} from "./fixtures/editor";

// Resume content that must never appear in any request: the fixture's values and the edit.
const RESUME_CONTENT = [
  "Ada Fixture",
  "Ada_Fixture",
  "ada.fixture@example.com",
  "555-010-0199",
  "Builds small, reliable tools",
  "Example Labs",
  "Example University",
  EDITED_LABEL,
];

// TODO: remove after #166 lands. The layout still loads Google Fonts until then. These requests are
// aborted below so the test needs no network, and only a bodyless GET may reach these hosts.
const PENDING_REMOVAL_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

// Observes HTTP requests from pages, subframes and dedicated workers, plus page WebSockets.
// WebSockets opened inside workers are not observed. Anything that is not a plain GET/HEAD to the
// app's own origin, or that carries resume content, is reported as a violation and aborted.
async function observeNetwork(context: BrowserContext, origin: string) {
  const violations: string[] = [];
  const requests: Request[] = [];

  const inspect = (request: Request): string | null => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return null;

    const haystack = [
      decodeURIComponent(request.url()),
      request.postData() ?? "",
      JSON.stringify(request.headers()),
    ].join("\n");
    const leaked = RESUME_CONTENT.find((value) => haystack.includes(value));
    if (leaked) return `carries resume content (${leaked})`;

    const readOnly = ["GET", "HEAD"].includes(request.method());
    if (url.origin === origin) {
      return readOnly && request.postDataBuffer() === null ? null : "sends a body or mutates";
    }
    if (PENDING_REMOVAL_FONT_HOSTS.has(url.hostname)) {
      return readOnly && request.postDataBuffer() === null ? null : "sends a body or mutates";
    }
    return "leaves the app origin";
  };

  context.on("request", (request) => {
    requests.push(request);
    const problem = inspect(request);
    if (problem) violations.push(`${request.method()} ${request.url()} ${problem}`);
  });

  await context.route("**/*", (route) => {
    const request = route.request();
    const { hostname, protocol } = new URL(request.url());
    if (PENDING_REMOVAL_FONT_HOSTS.has(hostname)) return route.abort();
    if (inspect(request) && protocol !== "data:" && protocol !== "blob:") {
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });

  await context.routeWebSocket(/.*/, async (socket) => {
    violations.push(`WebSocket ${socket.url()}`);
    await socket.close({ code: 1008, reason: "Privacy guard" });
  });

  return { requests, violations };
}

test("import, edit and export send nothing off the app origin", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing preview baseURL");
  const guard = await observeNetwork(context, new URL(baseURL).origin);
  await removeNavigatorShare(page);

  await page.goto("/editor");
  await importFixtureResume(page);
  await editLabel(page);
  await waitForAutosave(page);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await jsonDownload;

  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  await pdfDownload;

  // Leave the editor so unload handlers and beacons would run before the check.
  await page.goto("/");

  // The guard only counts if it saw the editor's own traffic.
  expect(guard.requests.map((request) => new URL(request.url()).pathname)).toContain("/editor");
  expect(guard.violations).toEqual([]);
  expect(await context.cookies(), "The editor must not set cookies").toEqual([]);
});

test("guard control: reports a cross-origin request and a request carrying resume content", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing preview baseURL");
  const guard = await observeNetwork(context, new URL(baseURL).origin);

  await page.goto("/editor");
  const outcomes = await page.evaluate(async (origin) => {
    const attempt = (url: string, init?: RequestInit) =>
      fetch(url, { mode: "no-cors", ...init }).then(
        () => "resolved",
        () => "rejected"
      );
    return [
      await attempt("https://privacy.invalid/collect"),
      await attempt(`${origin}/editor`, { method: "POST", body: "Ada Fixture" }),
    ];
  }, new URL(baseURL).origin);

  // The guard aborts both requests, so neither one reaches a network.
  expect(outcomes).toEqual(["rejected", "rejected"]);
  expect(guard.violations).toEqual([
    "GET https://privacy.invalid/collect leaves the app origin",
    `POST ${baseURL}/editor carries resume content (Ada Fixture)`,
  ]);
});
