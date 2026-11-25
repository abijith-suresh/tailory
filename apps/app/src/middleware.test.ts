import { afterEach, describe, expect, it, vi } from "vitest";

import middleware from "./middleware";

const [loopbackOnly] = middleware;

const run = (url: string, headers: Record<string, string>) => {
  const next = vi.fn(async () => new Response("page"));
  const event = { request: new Request(url, { headers }) } as Parameters<typeof loopbackOnly>[0];
  return { response: loopbackOnly(event, next), next };
};

describe("loopback middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    (globalThis as Record<symbol, unknown>)[Symbol.for("tailory.runtime")] = {};
  });

  it("passes loopback requests through in local mode", async () => {
    const { response, next } = run("http://127.0.0.1:4413/", { host: "127.0.0.1:4413" });
    expect((await response).status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });

  it("answers 403 for a foreign Host or Origin in local mode", async () => {
    const foreignHost = run("http://evil.example/", { host: "evil.example" });
    expect((await foreignHost.response).status).toBe(403);
    expect(foreignHost.next).not.toHaveBeenCalled();

    const foreignOrigin = run("http://localhost/", {
      host: "localhost:4413",
      origin: "http://evil.example",
    });
    expect((await foreignOrigin.response).status).toBe(403);
  });

  it("doesn't check hosts in server mode", async () => {
    vi.stubEnv("TAILORY_MODE", "server");
    const { response } = run("http://tailory.example/", { host: "tailory.example" });
    expect((await response).status).toBe(200);
  });
});
