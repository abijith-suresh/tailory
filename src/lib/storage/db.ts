import { type IDBPDatabase, openDB } from "idb";
import type { ResumeSchema } from "@/types/resume";

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

async function getDB(): Promise<IDBPDatabase<TailoryDB>> {
  if (_db) return _db;
  _db = await openDB<TailoryDB>("tailory", 1, {
    upgrade(db) {
      db.createObjectStore("drafts", { keyPath: "id" });
    },
  });
  return _db;
}

export async function saveDraft(draft: ResumeDraft): Promise<void> {
  const db = await getDB();
  await db.put("drafts", draft);
}

export async function getDraft(id: string): Promise<ResumeDraft | undefined> {
  const db = await getDB();
  return db.get("drafts", id);
}

export async function listDrafts(): Promise<ResumeDraft[]> {
  const db = await getDB();
  const all = await db.getAll("drafts");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("drafts", id);
}
