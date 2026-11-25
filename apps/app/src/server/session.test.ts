import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { signUp } from "./testing/mcp-client";
import { startTestServer, type TestServer } from "./testing/server";

const event = vi.hoisted(() => ({ current: undefined as { request: Request } | undefined }));
vi.mock("@solidjs/web", () => ({ getRequestEvent: () => event.current }));

const { requireViewer } = await import("./session");
const { deleteAccount, getSignInMethods, getViewer } = await import("./functions");

const callWith = (headers: Record<string, string>) => {
  event.current = { request: new Request("http://localhost/_server/x", { headers }) };
  return requireViewer();
};

const statusOf = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (thrown) {
    return thrown instanceof Response ? thrown.status : "not a Response";
  }
  return "resolved";
};

afterEach(() => {
  event.current = undefined;
});

describe("requireViewer in server mode", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "server" });
  });
  afterAll(() => server.close());

  it("throws a 401 response when nobody is signed in", async () => {
    expect(await statusOf(callWith({}))).toBe(401);
    expect(await statusOf(callWith({ cookie: "better-auth.session_token=forged" }))).toBe(401);
    event.current = undefined;
    expect(await statusOf(requireViewer())).toBe(401);
  });

  it("returns the signed-in user", async () => {
    const cookie = await signUp(server.url, "Katherine Johnson");
    expect(await callWith({ cookie })).toMatchObject({ name: "Katherine Johnson" });
  });
});

describe("requireViewer in local mode", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "local" });
  });
  afterAll(() => server.close());

  it("acts as the local user", async () => {
    expect(await callWith({})).toEqual({
      id: "local",
      name: "You",
      email: "local@tailory.invalid",
    });
  });
});

describe("server functions", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({
      mode: "server",
      env: { TAILORY_GITHUB_CLIENT_ID: "gh", TAILORY_GITHUB_CLIENT_SECRET: "gh-secret" },
    });
  });
  afterAll(() => server.close());

  const as = (cookie?: string) => {
    event.current = {
      request: new Request("http://localhost/_server/x", { headers: cookie ? { cookie } : {} }),
    };
  };

  it("lists the enabled sign-in methods to anyone", async () => {
    as();
    expect(await getSignInMethods()).toEqual({ emailPassword: true, github: true, google: false });
  });

  it("answers 401 to signed-out callers", async () => {
    as();
    expect(await statusOf(getViewer())).toBe(401);
    expect(await statusOf(deleteAccount())).toBe(401);
  });

  it("deletes the caller's account, after which the session is gone", async () => {
    const cookie = await signUp(server.url, "Mary Jackson");
    as(cookie);
    expect(await getViewer()).toMatchObject({ name: "Mary Jackson", mode: "server" });
    expect(await deleteAccount()).toEqual({ deleted: true });
    expect(await statusOf(getViewer())).toBe(401);
  });
});
