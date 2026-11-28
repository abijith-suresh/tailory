"use server";

// Server functions the pages call. Each one checks who is calling itself.

import { deleteUser } from "./account";
import {
  eraseData,
  exportFile,
  keepAll,
  keepOne,
  pendingChangesView,
  undoAll,
  undoOne,
} from "./actions";
import type { DataContext } from "./data";
import { createDownloadLink } from "./downloads";
import {
  createApplicationFromForm,
  editApplication,
  getApplicationPdf,
  getApplicationView,
  getBoardView,
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

/** The board's cards: every application, archived ones too, most recently moved first. */
export async function getBoard() {
  return getBoardView(await userData());
}

/** An application's PDF as it prints, base64, for its card's thumbnail; null if nothing prints. */
export async function getCardPdf(id: string) {
  return getApplicationPdf(await userData(), String(id));
}

/** Page results for the rows on the home screen, by application id. */
export async function getPageResults(ids: string[]) {
  return listPageResults(await userData(), Array.isArray(ids) ? ids.map(String) : []);
}

/** Everything the Application screen shows, or null for an id the caller doesn't have. */
export async function getApplicationScreen(id: string) {
  return getApplicationView(await userData(), String(id));
}

/**
 * Starts an application from the New application dialog: company, role, and optionally the
 * posting link and job description. It keeps the whole profile, in the profile's section order.
 */
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

// ── Reviewing the agent's changes ────────────────────────────────────────────────────────────

/**
 * An application's pending agent changes, newest first, with what each shows on the page: the
 * lines it reworded and the items it left out. Null for an id the caller doesn't have.
 */
export async function getPendingChanges(applicationId: string) {
  return pendingChangesView(await userData(), String(applicationId));
}

/** Keeps one of the agent's changes. */
export async function keepAgentChange(changeId: string) {
  return keepOne(await userData(), String(changeId));
}

/** Undoes one change, and marks it undone. */
export async function undoAgentChange(changeId: string) {
  return undoOne(await userData(), String(changeId));
}

/** Keeps every pending change to an application. */
export async function keepAllAgentChanges(applicationId: string) {
  return keepAll(await userData(), String(applicationId));
}

/** Undoes every pending change to an application, all or none. */
export async function undoAllAgentChanges(applicationId: string) {
  return undoAll(await userData(), String(applicationId));
}

// ── Settings › Data ──────────────────────────────────────────────────────────────────────────

/** Everything the caller keeps, profile and applications, as one JSON file to save. */
export async function exportAllData() {
  return exportFile(await userData());
}

/**
 * Erases everything the caller keeps. In local mode the local user stays, empty; in server mode
 * this deletes the account, as deleteAccount does.
 */
export async function eraseAllData() {
  return eraseData(await userData(), getConfig().mode);
}
