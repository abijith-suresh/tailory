// Heuristic resume parser
// Stub — will be fully implemented in Phase 3
import type { ResumeSchema } from "@/types/resume";

export interface ParseResult {
  data: ResumeSchema;
  confidence: number;
  rawSections: Record<string, string>;
}

export async function parseResume(_rawText: string): Promise<ParseResult> {
  throw new Error("Not implemented yet");
}
