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
    const existingDraft = await db.get("drafts", draft.id);
    const normalizedDraft = {
      ...draft,
      name: draft.name.trim() || "Untitled",
      resumeData: normalizeResume(draft.resumeData),
    };

    await db.put("drafts", {
      ...normalizedDraft,
      createdAt: existingDraft?.createdAt ?? normalizedDraft.createdAt,
    });

    return true;
  } catch {
    resetDbConnection();
    return false;
  }
}

export async function getDraft(id: string): Promise<ResumeDraft | undefined> {
  try {
    const db = await getDB();
    const draft = await db.get("drafts", id);
    return draft
      ? {
          ...draft,
          name: draft.name.trim() || "Untitled",
          resumeData: normalizeResume(draft.resumeData),
        }
      : undefined;
  } catch {
    resetDbConnection();
    return undefined;
  }
}

export async function listDrafts(): Promise<ResumeDraft[]> {
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
    return [];
  }
}

export async function deleteDraft(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete("drafts", id);
    return true;
  } catch {
    resetDbConnection();
    return false;
  }
}
