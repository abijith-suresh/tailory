"use server";

// Server functions the pages call. Each one checks who is calling itself.

import { deleteUser } from "./account";
import type { DataContext } from "./data";
import { createDownloadLink } from "./downloads";
import {
  createApplicationFromForm,
  editApplication,
  getApplicationView,
  getHomeView,
  listPageResults,
  undoApplicationChange,
} from "./pages";
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

// ── Applications ─────────────────────────────────────────────────────────────────────────────

/** The caller's data, acting as them. */
const userData = async (): Promise<DataContext> => {
  const viewer = await requireViewer();
  const { db } = await getDatabase();
  return { db, userId: viewer.id, actor: { kind: "user" } };
};

/** The home screen's rows, and whether there are any applications at all. */
export async function getApplicationRows(search: string, showArchived: boolean) {
  return getHomeView(await userData(), {
    search: String(search ?? ""),
    showArchived: showArchived === true,
  });
}

/** Page results for the rows on the home screen, by application id. */
export async function getPageResults(ids: string[]) {
  return listPageResults(await userData(), Array.isArray(ids) ? ids.map(String) : []);
}

/** Everything the Application screen shows, or null for an id the caller doesn't have. */
export async function getApplicationScreen(id: string) {
  return getApplicationView(await userData(), String(id));
}

export async function newApplication(input: unknown) {
  return createApplicationFromForm(await userData(), input);
}

/** One edit from the Application screen; see applicationEditInput. */
export async function changeApplication(id: string, edit: unknown) {
  return editApplication(await userData(), String(id), edit);
}

export async function undoApplication(id: string, changeId: string) {
  return undoApplicationChange(await userData(), String(id), String(changeId));
}

/**
 * A link that downloads an application's resume, the same kind export_resume gives agents. The
 * path is relative, so it works on whatever address the page was opened at.
 */
export async function getDownloadUrl(id: string, format: "pdf" | "json") {
  const viewer = await requireViewer();
  return createDownloadLink("", {
    userId: viewer.id,
    applicationId: String(id),
    format: format === "json" ? "json" : "pdf",
  }).url;
}
