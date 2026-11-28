/**
 * Names the site a profile link points to, from its address: "github.com/ada" is GitHub. The name
 * is what JSON Resume calls `profiles[].network`. Addresses we don't know are a "Website".
 */

export type LinkSite = {
  /** The network name for JSON Resume, or null for a personal site. */
  network: string | null;
  /** What to show beside the address. */
  label: string;
  /** Whether the address is on a site we recognise. */
  known: boolean;
};

/** Host (or parent domain) → network name. Subdomains match too: ada.medium.com is Medium. */
const SITES: Record<string, string> = {
  "behance.net": "Behance",
  "bitbucket.org": "Bitbucket",
  "bsky.app": "Bluesky",
  "codeberg.org": "Codeberg",
  "codepen.io": "CodePen",
  "dev.to": "DEV",
  "dribbble.com": "Dribbble",
  "facebook.com": "Facebook",
  "figma.com": "Figma",
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "huggingface.co": "Hugging Face",
  "instagram.com": "Instagram",
  "kaggle.com": "Kaggle",
  "leetcode.com": "LeetCode",
  "linkedin.com": "LinkedIn",
  "medium.com": "Medium",
  "npmjs.com": "npm",
  "orcid.org": "ORCID",
  "scholar.google.com": "Google Scholar",
  "stackoverflow.com": "Stack Overflow",
  "substack.com": "Substack",
  "threads.net": "Threads",
  "twitter.com": "X",
  "x.com": "X",
  "youtu.be": "YouTube",
  "youtube.com": "YouTube",
};

const hostOf = (value: string): string | null => {
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // A bare word ("hello") parses as a host; a site needs a dot.
    if (!url.hostname.includes(".")) return null;
    return url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  } catch {
    return null;
  }
};

/** The site for an address, or null when the field is empty. */
export function siteFromUrl(value: string): LinkSite | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^mailto:/i.test(trimmed)) return { network: null, label: "Email", known: false };
  const host = hostOf(trimmed);
  if (!host) return { network: null, label: "Link", known: false };
  const parts = host.split(".");
  for (let start = 0; start < parts.length - 1; start++) {
    const network = SITES[parts.slice(start).join(".")];
    if (network) return { network, label: network, known: true };
  }
  return { network: null, label: "Website", known: false };
}
