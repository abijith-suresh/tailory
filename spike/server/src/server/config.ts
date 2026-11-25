// One app, three ways to run it. The mode decides who the user is.
//   local    – `npx tailory`: loopback only, no sign-in, one fixed user.
//   selfhost – Docker: Better Auth, email+password allowed by flag.
//   hosted   – Railway: Better Auth, GitHub + Google only.
export type Mode = "local" | "selfhost" | "hosted";

export const mode = (process.env.TAILORY_MODE ?? "hosted") as Mode;
export const port = Number(process.env.PORT ?? 4413);
export const host = process.env.HOST ?? (mode === "local" ? "127.0.0.1" : "0.0.0.0");
export const siteUrl = (process.env.SITE_URL ?? `http://localhost:${port}`).replace(/\/$/, "");
export const emailPasswordEnabled = process.env.TAILORY_EMAIL_PASSWORD === "true";
export const LOCAL_USER_ID = "local";

const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
export const isLoopbackHost = (h: string) => loopbackHosts.has(h);

if (mode === "local" && !isLoopbackHost(host)) {
  // Fail closed: local mode has no authentication at all.
  throw new Error(`TAILORY_MODE=local refuses to bind to non-loopback host ${host}`);
}
