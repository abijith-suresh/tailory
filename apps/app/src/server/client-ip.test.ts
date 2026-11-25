import { describe, expect, it } from "vitest";

import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("uses the socket address unless the proxy is trusted", () => {
    expect(
      clientIp({ socketAddress: "203.0.113.9", forwardedFor: "198.51.100.1", trustProxy: false })
    ).toBe("203.0.113.9");
  });

  it("takes the entry the trusted proxy appended, not the ones the client sent", () => {
    expect(
      clientIp({
        socketAddress: "10.0.0.2",
        forwardedFor: "1.2.3.4, 198.51.100.7",
        trustProxy: true,
      })
    ).toBe("198.51.100.7");
    expect(
      clientIp({
        socketAddress: "10.0.0.2",
        forwardedFor: ["1.2.3.4", "2001:db8::1"],
        trustProxy: true,
      })
    ).toBe("2001:db8::1");
  });

  it("falls back to the socket when the header is missing or not an address", () => {
    for (const forwardedFor of [undefined, "", "unknown"]) {
      expect(clientIp({ socketAddress: "10.0.0.2", forwardedFor, trustProxy: true })).toBe(
        "10.0.0.2"
      );
    }
  });

  it("unwraps IPv4-mapped IPv6 addresses", () => {
    expect(
      clientIp({ socketAddress: "::ffff:127.0.0.1", forwardedFor: undefined, trustProxy: false })
    ).toBe("127.0.0.1");
    expect(clientIp({ socketAddress: undefined, forwardedFor: undefined, trustProxy: false })).toBe(
      undefined
    );
  });
});
