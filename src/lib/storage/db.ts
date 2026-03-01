// IndexedDB wrapper using idb
// Stub — will be fully implemented in Phase 6
import type { ResumeSchema } from "@/types/resume";

export interface ResumeDraft {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  resumeData: ResumeSchema;
}

export async function saveDraft(_draft: ResumeDraft): Promise<void> {
  throw new Error("Not implemented yet");
}

export async function getDraft(_id: string): Promise<ResumeDraft | undefined> {
  throw new Error("Not implemented yet");
}

export async function listDrafts(): Promise<ResumeDraft[]> {
  throw new Error("Not implemented yet");
}

export async function deleteDraft(_id: string): Promise<void> {
  throw new Error("Not implemented yet");
}
