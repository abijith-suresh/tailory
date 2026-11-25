"use server";

// Server functions the pages call. Each one checks who is calling itself.

import { deleteUser } from "./account";
import { getConfig, getDatabase } from "./runtime";
import { requireViewer } from "./session";

/** The signed-in user and how Tailory runs. */
export async function getViewer() {
  const viewer = await requireViewer();
  return { name: viewer.name, email: viewer.email, mode: getConfig().mode };
}

/** The sign-in methods this server offers. Open to signed-out visitors. */
export async function getSignInMethods() {
  const auth = getConfig().auth;
  return {
    emailPassword: auth?.emailPassword ?? false,
    github: Boolean(auth?.github),
    google: Boolean(auth?.google),
  };
}

/** Deletes the caller's account and everything it owns. */
export async function deleteAccount() {
  const viewer = await requireViewer();
  const { db } = await getDatabase();
  await deleteUser(db, viewer.id);
  return { deleted: true };
}
