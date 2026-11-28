// The web app's review, export and erase actions, for one user. The server functions in
// ./functions.ts check who is calling and hand the work here, so this runs in tests without a
// request.

import { deleteUser } from "./account";
import {
  type DataContext,
  DataError,
  type DataExport,
  eraseUserData,
  exportEverything,
  keepAllChanges,
  keepChange,
  listPendingChanges,
  type PendingChange,
  undoAllChanges,
  undoChange,
} from "./data";
import type { WriteResult } from "./pages";

type ReadContext = Pick<DataContext, "db" | "userId">;

const reviewFailure = (error: unknown): { ok: false; error: string } => {
  if (error instanceof DataError) {
    const messages: Record<DataError["code"], string> = {
      conflict:
        error.message === "This change was undone"
          ? "This change was undone already."
          : "Can't undo this: it was changed again since. Keep it, or undo the later changes first.",
      not_found: "That change is gone.",
      invalid: error.message,
    };
    return { ok: false, error: messages[error.code] };
  }
  throw error;
};

/** An application's pending agent changes, as the page marks them. Null for an unknown id. */
export const pendingChangesView = async (
  ctx: ReadContext,
  applicationId: string
): Promise<PendingChange[] | null> => {
  try {
    return await listPendingChanges(ctx, applicationId);
  } catch (error) {
    if (error instanceof DataError && error.code === "not_found") return null;
    throw error;
  }
};

/** Keeps one of the agent's changes. */
export const keepOne = async (ctx: DataContext, changeId: string): Promise<WriteResult> => {
  try {
    await keepChange(ctx, changeId);
    return { ok: true, value: undefined };
  } catch (error) {
    return reviewFailure(error);
  }
};

/** Undoes one change and marks it undone. */
export const undoOne = async (ctx: DataContext, changeId: string): Promise<WriteResult> => {
  try {
    await undoChange(ctx, changeId);
    return { ok: true, value: undefined };
  } catch (error) {
    return reviewFailure(error);
  }
};

/** Keeps every pending change to an application. Answers with how many. */
export const keepAll = async (
  ctx: DataContext,
  applicationId: string
): Promise<WriteResult<{ count: number }>> => {
  try {
    const count = await keepAllChanges(ctx, { kind: "application", id: applicationId });
    return { ok: true, value: { count } };
  } catch (error) {
    return reviewFailure(error);
  }
};

/** Undoes every pending change to an application, all or none. Answers with how many. */
export const undoAll = async (
  ctx: DataContext,
  applicationId: string
): Promise<WriteResult<{ count: number }>> => {
  try {
    const undone = await undoAllChanges(ctx, { kind: "application", id: applicationId });
    return { ok: true, value: { count: undone.length } };
  } catch (error) {
    return reviewFailure(error);
  }
};

/** Everything the user keeps as one JSON file: its name and its value. */
export const exportFile = async (
  ctx: ReadContext,
  now = new Date()
): Promise<{ fileName: string; data: DataExport }> => ({
  fileName: `tailory-export-${now.toISOString().slice(0, 10)}.json`,
  data: await exportEverything(ctx, now),
});

/**
 * Erases the user's data. Local mode keeps its one user and empties it; server mode deletes the
 * account and everything it owns, as Delete account does.
 */
export const eraseData = async (
  ctx: ReadContext,
  mode: "local" | "server"
): Promise<{ erased: true; applications: number; accountDeleted: boolean }> => {
  if (mode === "local") {
    const { applications } = await eraseUserData(ctx.db, ctx.userId);
    return { erased: true, applications, accountDeleted: false };
  }
  const { applications } = await eraseUserData(ctx.db, ctx.userId);
  await deleteUser(ctx.db, ctx.userId);
  return { erased: true, applications, accountDeleted: true };
};
