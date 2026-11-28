/** The app's main navigation, in order. `short` is the label on phones. */
export const NAV_ITEMS = [
  { href: "/", label: "Applications", short: "Apps" },
  { href: "/profile", label: "Profile", short: "Profile" },
  { href: "/settings", label: "Settings", short: "Settings" },
] as const;

/**
 * Whether a nav item is the current section. Applications is the home screen, so it also owns the
 * pages under /applications. Settings owns Connect an agent, which becomes Settings › Agents.
 */
export const isCurrent = (href: string, pathname: string) => {
  if (href === "/") return pathname === "/" || pathname.startsWith("/applications/");
  if (href === "/settings" && (pathname === "/connect" || pathname.startsWith("/connect/")))
    return true;
  return pathname === href || pathname.startsWith(`${href}/`);
};
