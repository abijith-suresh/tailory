import { describe, expect, it } from "vitest";

import { isLoopbackHostname, localRejectionResponse, localRequestRejection } from "./loopback";

describe("isLoopbackHostname", () => {
  it.each(["localhost", "LOCALHOST", "127.0.0.1", "127.255.0.9", "::1", "[::1]"])(
    "accepts %s",
    (host) => expect(isLoopbackHostname(host)).toBe(true)
  );

  it.each(["0.0.0.0", "128.0.0.1", "127.0.0.256", "127.0.0", "localhost.evil.example", "::", "x"])(
    "rejects %s",
    (host) => expect(isLoopbackHostname(host)).toBe(false)
  );
});

describe("localRequestRejection", () => {
  it.each(["127.0.0.1:4413", "localhost:4413", "localhost", "[::1]:4413"])(
    "allows Host %s",
    (host) => expect(localRequestRejection({ host })).toBeNull()
  );

  it.each([undefined, null, "", "evil.example", "evil.example:4413", "192.168.0.2:4413", "a b"])(
    "refuses Host %s",
    (host) => expect(localRequestRejection({ host })).toBe("Host is not a loopback address")
  );

  it.each(["http://localhost:4413", "http://127.0.0.1:5173", "https://[::1]"])(
    "allows Origin %s",
    (origin) => expect(localRequestRejection({ host: "localhost:4413", origin })).toBeNull()
  );

  it.each([
    "http://evil.example",
    "null",
    "file:///tmp/x.html",
    "",
    "http://127.0.0.1.evil.example",
  ])("refuses Origin %s", (origin) =>
    expect(localRequestRejection({ host: "localhost:4413", origin })).toBe(
      "Origin is not a loopback address"
    )
  );

  it("builds a 403 response", async () => {
    const response = localRejectionResponse("Host is not a loopback address");
    expect(response.status).toBe(403);
    expect(await response.text()).toContain("Host is not a loopback address");
  });
});
