import { type IDBPDatabase, type IDBPTransaction, openDB, type StoreNames } from "idb";
import { normalizeDocument } from "@/lib/versions/document";
import type { ResumeDocument } from "@/types/document";
import { readDraftRecord } from "./migrate";

export const AUTOSAVE_DRAFT_ID = "autosave";

/**
 * Version 1 stored a draft's resume as `resumeData`. Version 2 stores a document: the master
 * resume and its versions.
 */
export const DB_VERSION = 2;

export interface ResumeDraft {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  document: ResumeDocument;
}

interface TailoryDB {
  drafts: {
    key: string;
    value: ResumeDraft;
  };
}

let _db: IDBPDatabase<TailoryDB> | null = null;

// createdAt of drafts this tab has already read or written (null: not stored yet). Knowing it lets
// saveDraft write without reading first, so a save started as the page closes reaches IndexedDB.
const knownCreatedAt = new Map<string, number | null>();

function resetDbConnection() {
  _db = null;
}

/**
 * Rewrites every version 1 draft as a document. Any failure aborts the upgrade, which leaves the
 * old drafts as they were and the database at version 1.
 */
async function migrateDraftsToDocuments(
  tx: IDBPTransaction<TailoryDB, StoreNames<TailoryDB>[], "versionchange">
) {
  // An abort is reported through the failed open; don't also leave it unhandled here.
  tx.done.catch(() => undefined);
  try {
    let cursor = await tx.objectStore("drafts").openCursor();
    while (cursor) {
      await cursor.update(readDraftRecord(cursor.value));
      cursor = await cursor.continue();
    }
  } catch {
    try {
      tx.abort();
    } catch {
      // Already aborted by the failed request.
    }
  }
}

/**
 * Opens the database, upgrading it if needed. Fails instead of waiting when an older Tailory in
 * another tab holds the database open: once that tab closed, the editor would load the saved
 * resume over anything typed in the meantime.
 */
function openTailoryDB(): Promise<IDBPDatabase<TailoryDB>> {
  return new Promise((resolve, reject) => {
    let gaveUp = false;
    openDB<TailoryDB>("tailory", DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("drafts", { keyPath: "id" });
          return;
        }
        if (oldVersion < 2) void migrateDraftsToDocuments(tx);
      },
      blocked() {
        gaveUp = true;
        reject(new Error("Another tab is using an older version of the database."));
      },
      // Let a newer Tailory in another tab upgrade the database instead of waiting on this one.
      blocking() {
        _db?.close();
        resetDbConnection();
      },
    }).then((db) => {
      if (gaveUp) db.close();
      else resolve(db);
    }, reject);
  });
}

async function getDB(): Promise<IDBPDatabase<TailoryDB>> {
  if (_db) return _db;
  try {
    _db = await openTailoryDB();
    return _db;
  } catch (error) {
    resetDbConnection();
    throw error;
  }
}

export async function isDraftStorageAvailable(): Promise<boolean> {
  try {
    await getDB();
    return true;
  } catch {
    return false;
  }
}

export async function saveDraft(draft: ResumeDraft): Promise<boolean> {
  try {
    const db = await getDB();
    const createdAt = knownCreatedAt.has(draft.id)
      ? knownCreatedAt.get(draft.id)
      : (await db.get("drafts", draft.id))?.createdAt;
    const savedDraft = {
      ...draft,
      name: draft.name.trim() || "Untitled",
      document: normalizeDocument(draft.document),
      createdAt: createdAt ?? draft.createdAt,
    };

    const tx = db.transaction("drafts", "readwrite");
    const put = tx.store.put(savedDraft);
    // Commit now instead of after the next task, which never comes once the page is closing.
    tx.commit();
    await Promise.all([put, tx.done]);
    knownCreatedAt.set(draft.id, savedDraft.createdAt);

    return true;
  } catch {
    resetDbConnection();
    return false;
  }
}

/** Returns undefined when there is no such draft and null when it can't be read. */
export async function getDraft(id: string): Promise<ResumeDraft | undefined | null> {
  try {
    const db = await getDB();
    const draft = await db.get("drafts", id);
    knownCreatedAt.set(id, draft?.createdAt ?? null);
    return draft ? readDraftRecord(draft) : undefined;
  } catch {
    resetDbConnection();
    return null;
  }
}

/** Returns null when drafts can't be read, so callers can tell a failure from an empty list. */
export async function listDrafts(): Promise<ResumeDraft[] | null> {
  try {
    const db = await getDB();
    const all = await db.getAll("drafts");
    return all.map(readDraftRecord).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    resetDbConnection();
    return null;
  }
}

export async function deleteDraft(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete("drafts", id);
    knownCreatedAt.delete(id);
    return true;
  } catch {
    resetDbConnection();
    return false;
  }
}
