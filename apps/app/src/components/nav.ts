/** The app's primary navigation, in order. */
export const NAV_ITEMS = [
  { href: "/", label: "Applications" },
  { href: "/profile", label: "Profile" },
  { href: "/connect", label: "Connect an agent" },
  { href: "/settings", label: "Settings" },
] as const;

/**
 * Whether a nav item is the current section. Applications is the home screen, so it also owns the
 * pages under /applications.
 */
export const isCurrent = (href: string, pathname: string) => {
  if (href === "/") return pathname === "/" || pathname.startsWith("/applications/");
  return pathname === href || pathname.startsWith(`${href}/`);
};
