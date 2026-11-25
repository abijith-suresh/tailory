import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { signUp } from "./server/testing/mcp-client";
import { startTestServer, type TestServer } from "./server/testing/server";

// Page gating in the middleware. The test server doesn't render pages, so a request the gate
// lets through gets a 404.

const get = (url: string, cookie?: string) =>
  fetch(url, { redirect: "manual", headers: cookie ? { cookie } : {} });

describe("server mode", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "server" });
  });
  afterAll(() => server.close());

  it("sends signed-out page requests to the sign-in page, keeping where they were going", async () => {
    for (const [path, next] of [
      ["/", "/"],
      ["/settings?tab=account", "/settings?tab=account"],
      ["/oauth/consent?client_id=x", "/oauth/consent?client_id=x"],
    ]) {
      const response = await get(`${server.url}${path}`);
      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location") as string, server.url);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("next")).toBe(next);
    }
    const head = await fetch(`${server.url}/`, { method: "HEAD", redirect: "manual" });
    expect(head.status).toBe(302);
  });

  it("lets the sign-in page, server functions and signed-in people through", async () => {
    expect((await get(`${server.url}/sign-in`)).status).toBe(404);
    expect((await get(`${server.url}/_server/anything`)).status).toBe(404);
    const cookie = await signUp(server.url, "Signed In");
    expect((await get(`${server.url}/`, cookie)).status).toBe(404);
  });

  it("serves the health check without a session", async () => {
    expect((await get(`${server.url}/healthz`)).status).toBe(200);
  });
});

describe("local mode", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "local" });
  });
  afterAll(() => server.close());

  it("has nothing to sign in to", async () => {
    const response = await get(`${server.url}/sign-in`);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location") as string).pathname).toBe("/");
    expect((await get(`${server.url}/`)).status).toBe(404);
  });
});
