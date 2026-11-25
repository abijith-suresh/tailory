// Local mode has no sign-in: anything that can reach the port acts as the owner. It binds to
// loopback only, and it answers only requests whose Host and Origin name a loopback address, so a
// web page on another site can't reach it through DNS rebinding or a cross-site request.

/** True for `localhost`, the 127.0.0.0/8 range, and `::1` (with or without brackets). */
export const isLoopbackHostname = (hostname: string): boolean => {
  const name = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (name === "localhost" || name === "::1") return true;
  const octets = name.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
};

/** The hostname part of a Host header (`127.0.0.1:4413`, `[::1]:4413`), or null if malformed. */
const hostnameOfHostHeader = (host: string): string | null => {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
};

/**
 * Why a local-mode request must be refused, or null when it may proceed. A request needs a
 * loopback Host header; an Origin header, when present, must be a loopback http(s) origin too.
 */
export const localRequestRejection = (headers: {
  host?: string | null;
  origin?: string | null;
}): string | null => {
  const hostname = headers.host ? hostnameOfHostHeader(headers.host) : null;
  if (!hostname || !isLoopbackHostname(hostname)) return "Host is not a loopback address";
  if (headers.origin != null) {
    let origin: URL;
    try {
      origin = new URL(headers.origin);
    } catch {
      return "Origin is not a loopback address";
    }
    if (!["http:", "https:"].includes(origin.protocol) || !isLoopbackHostname(origin.hostname)) {
      return "Origin is not a loopback address";
    }
  }
  return null;
};

export const localRejectionResponse = (reason: string): Response =>
  new Response(`Forbidden: ${reason}. Tailory local mode only answers on this computer.\n`, {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
