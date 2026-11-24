import { type IDBPDatabase, openDB } from "idb";
import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeSchema } from "@/types/resume";

export const AUTOSAVE_DRAFT_ID = "autosave";

export interface ResumeDraft {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  resumeData: ResumeSchema;
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

async function getDB(): Promise<IDBPDatabase<TailoryDB>> {
  if (_db) return _db;
  try {
    _db = await openDB<TailoryDB>("tailory", 1, {
      upgrade(db) {
        db.createObjectStore("drafts", { keyPath: "id" });
      },
    });
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
      resumeData: normalizeResume(draft.resumeData),
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
    return draft
      ? {
          ...draft,
          name: draft.name.trim() || "Untitled",
          resumeData: normalizeResume(draft.resumeData),
        }
      : undefined;
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
    return all
      .map((draft) => ({
        ...draft,
        name: draft.name.trim() || "Untitled",
        resumeData: normalizeResume(draft.resumeData),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
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
