import { isIP } from "node:net";

// Better Auth rate-limits sign-in by client IP, but it only reads request headers. src/main.ts
// sets this header on every request, so the value can't come from the client.

export const CLIENT_IP_HEADER = "x-tailory-client-ip";

const unmapped = (address: string) => address.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, "$1");

/**
 * The client's IP address. Behind a trusted proxy that's the last `X-Forwarded-For` entry, the
 * one the proxy itself appended; earlier entries come from the client and can be forged.
 * Otherwise it's the socket's peer address.
 */
export const clientIp = (options: {
  socketAddress: string | undefined;
  forwardedFor: string | string[] | undefined;
  trustProxy: boolean;
}): string | undefined => {
  if (options.trustProxy) {
    const header = [options.forwardedFor ?? []].flat().join(",");
    const last = header.split(",").at(-1)?.trim();
    if (last && isIP(last)) return unmapped(last);
  }
  return options.socketAddress ? unmapped(options.socketAddress) : undefined;
};
