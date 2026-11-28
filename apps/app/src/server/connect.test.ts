import { describe, expect, it } from "vitest";

import { resolveConfig } from "./config";
import { mcpUrlFor } from "./connect";

const server = resolveConfig({
  TAILORY_MODE: "server",
  TAILORY_AUTH_SECRET: "x".repeat(32),
  TAILORY_PUBLIC_URL: "https://tailory.example.com/",
  TAILORY_AUTH_EMAIL_PASSWORD: "true",
});

describe("mcpUrlFor", () => {
  it("is the loopback address the page was reached on, in local mode", () => {
    const local = resolveConfig({});
    expect(mcpUrlFor(local, "http://127.0.0.1:4413/connect")).toBe("http://127.0.0.1:4413/mcp");
    expect(mcpUrlFor(local, "http://localhost:5000/_server?id=1")).toBe(
      "http://localhost:5000/mcp"
    );
    expect(mcpUrlFor(local, "http://[::1]:4413/connect")).toBe("http://[::1]:4413/mcp");
  });

  it("is the public URL plus /mcp in server mode, whatever address the request used", () => {
    expect(mcpUrlFor(server, "http://10.0.0.5:4413/connect")).toBe(
      "https://tailory.example.com/mcp"
    );
  });
});
