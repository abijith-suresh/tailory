// Which site a profile link points at, read from its URL, so people paste a link and never pick a
// network by hand.

/** The network a link gets when its site isn't one Tailory knows: the person's own site. */
export const WEBSITE_NETWORK = "Website";

/** Sites known by host. `user` reads the username from the path, when the path holds one. */
const KNOWN_SITES: { network: string; hosts: string[]; user: RegExp }[] = [
  { network: "GitHub", hosts: ["github.com"], user: /^\/([^/]+)\/?$/ },
  { network: "LinkedIn", hosts: ["linkedin.com"], user: /^\/in\/([^/]+)\/?$/ },
  { network: "X", hosts: ["x.com", "twitter.com"], user: /^\/([^/]+)\/?$/ },
  { network: "GitLab", hosts: ["gitlab.com"], user: /^\/([^/]+)\/?$/ },
  { network: "Dribbble", hosts: ["dribbble.com"], user: /^\/([^/]+)\/?$/ },
  { network: "Behance", hosts: ["behance.net"], user: /^\/([^/]+)\/?$/ },
];

/** Mastodon runs on many hosts; its profile paths look like `/@name`. */
const MASTODON_PATH = /^\/@([^/@]+)\/?$/;

export interface InferredLink {
  network: string;
  /** The username the URL holds, or "" when it holds none. */
  username: string;
}

const hostMatches = (host: string, known: string) => host === known || host.endsWith(`.${known}`);

/**
 * The network and username a URL points at: GitHub, LinkedIn, X, GitLab, Dribbble, Behance or
 * Mastodon. Null for any other site, and for text that isn't a web address.
 */
export function inferProfileLink(url: string): InferredLink | null {
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const path = decodeURIComponent(parsed.pathname);
  for (const site of KNOWN_SITES) {
    if (site.hosts.some((known) => hostMatches(host, known))) {
      return { network: site.network, username: site.user.exec(path)?.[1] ?? "" };
    }
  }
  const mastodon = MASTODON_PATH.exec(path);
  if (mastodon) return { network: "Mastodon", username: mastodon[1] ?? "" };
  return null;
}
