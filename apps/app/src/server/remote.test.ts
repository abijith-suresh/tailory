import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { runMcpFlow, signUp } from "./testing/mcp-client";

// Checks a running server-mode Tailory with email sign-in on, such as the Docker image in CI's
// app-package job: TAILORY_TEST_SERVER_URL=http://127.0.0.1:4413. Skipped otherwise. CIMD needs
// a metadata document on a public HTTPS URL, so this covers Dynamic Client Registration.
const url = process.env.TAILORY_TEST_SERVER_URL;

// Server function ids carry a build hash. The server under test runs the tarball built from this
// checkout, so the build's manifest names them.
const manifestFile = new URL(
  "../../dist/server/.vite/solid-server-functions.json",
  import.meta.url
);
const functionIds: Record<string, string> = existsSync(manifestFile)
  ? Object.fromEntries(
      (
        JSON.parse(readFileSync(manifestFile, "utf8")) as {
          functions: { id: string; name: string }[];
        }
      ).functions.map((fn) => [fn.name, fn.id])
    )
  : {};

/** Calls a server function the way the page's client runtime does. */
const callFunction = (origin: string, name: string, cookie?: string) =>
  fetch(`${origin}/_server/${functionIds[name]}`, {
    method: "POST",
    headers: {
      origin,
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "x-server-function-format": "8",
      ...(cookie ? { cookie } : {}),
    },
    body: "[]",
  });

describe.skipIf(!url)("a running server", () => {
  const origin = url as string;

  it("gates pages and renders the sign-in page", async () => {
    const home = await fetch(origin, { redirect: "manual" });
    expect(home.status).toBe(302);
    expect(home.headers.get("location")).toBe("/sign-in?next=%2F");
    const signIn = await fetch(`${origin}/sign-in`);
    expect(signIn.status).toBe(200);
    expect(await signIn.text()).toContain("Sign in to Tailory");
  });

  it("renders the signed-in home page", async () => {
    const cookie = await signUp(origin, "Container User");
    const home = await fetch(origin, { headers: { cookie } });
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("Signed in as Container User");
  });

  it.skipIf(!functionIds.deleteAccount)(
    "answers 401 from server functions to signed-out callers, and deletes accounts",
    async () => {
      expect((await callFunction(origin, "getViewer")).status).toBe(401);
      expect((await callFunction(origin, "deleteAccount")).status).toBe(401);
      expect(await (await callFunction(origin, "getSignInMethods")).json()).toEqual({
        emailPassword: true,
        github: false,
        google: false,
      });

      const cookie = await signUp(origin, "Leaving Soon");
      expect((await callFunction(origin, "getViewer", cookie)).status).toBe(200);
      expect((await callFunction(origin, "deleteAccount", cookie)).status).toBe(200);
      expect((await callFunction(origin, "getViewer", cookie)).status).toBe(401);
    }
  );

  it("completes the MCP sign-in with Dynamic Client Registration and calls a tool", async () => {
    const cookie = await signUp(origin, "Agent Owner");
    const result = await runMcpFlow(`${origin}/mcp`, { cookie, registration: "dcr" });
    expect(result.log.callback?.get("iss")).toBe(`${origin}/api/auth`);
    expect(result.protocolVersion).toBe("2026-07-28");
    expect(result.tools).toEqual(["whoami"]);
    expect(result.whoami).toEqual({ name: "Agent Owner", mode: "server" });
  });
});
