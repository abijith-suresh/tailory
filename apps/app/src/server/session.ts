import { getRequestEvent } from "@solidjs/web";

import { LOCAL_USER } from "./db";
import { getAuth, getConfig } from "./runtime";

/** Who a request acts as. */
export type Viewer = { id: string; name: string; email: string };

/**
 * The signed-in user, or null. Local mode has no sign-in: every request that got past the
 * loopback checks acts as the local user.
 */
export const viewerOf = async (request: Request): Promise<Viewer | null> => {
  if (getConfig().mode === "local") return { ...LOCAL_USER };
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
};

/** A body-less 401, which a server function can throw to answer with that status. */
export const notSignedIn = () =>
  new Response(null, { status: 401, headers: { "cache-control": "no-store" } });

/**
 * The user a server function call acts as. Throws a 401 response when nobody is signed in, so
 * the call answers 401 instead of 500. Server functions check this themselves: the middleware
 * only gates pages.
 */
export const requireViewer = async (): Promise<Viewer> => {
  const event = getRequestEvent();
  const viewer = event ? await viewerOf(event.request) : null;
  if (!viewer) throw notSignedIn();
  return viewer;
};
