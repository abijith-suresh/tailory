import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeSchema, TemplateId } from "@/types/resume";

const PRINT_JOB_PREFIX = "tailory:print-job:";
const PRINT_JOB_TTL_MS = 10 * 60 * 1000;

export interface PrintJobPayload {
  accentColor: string;
  createdAt: number;
  expiresAt: number;
  filename: string;
  resume: ResumeSchema;
  template: TemplateId;
}

function getStorage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Print storage is unavailable in this browser.");
  }

  return window.localStorage;
}

function getStorageKey(jobId: string): string {
  return `${PRINT_JOB_PREFIX}${jobId}`;
}

function getFilename(resume: ResumeSchema): string {
  const name = resume.basics.name.trim().replace(/\s+/g, "_") || "resume";
  return `${name}_resume.pdf`;
}

export function createPrintJob(
  resume: ResumeSchema,
  template: TemplateId,
  accentColor: string
): { jobId: string; payload: PrintJobPayload } {
  const storage = getStorage();
  const normalizedResume = normalizeResume(resume);
  const createdAt = Date.now();
  const jobId = globalThis.crypto?.randomUUID?.() ?? `print-${createdAt}`;
  const payload: PrintJobPayload = {
    accentColor,
    createdAt,
    expiresAt: createdAt + PRINT_JOB_TTL_MS,
    filename: getFilename(normalizedResume),
    resume: normalizedResume,
    template,
  };

  storage.setItem(getStorageKey(jobId), JSON.stringify(payload));
  return { jobId, payload };
}

export function persistPrintJob(jobId: string, payload: PrintJobPayload): void {
  getStorage().setItem(getStorageKey(jobId), JSON.stringify(payload));
}

export function readPrintJob(jobId: string): PrintJobPayload | null {
  const storage = getStorage();
  const raw = storage.getItem(getStorageKey(jobId));
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as PrintJobPayload;
    if (payload.expiresAt <= Date.now()) {
      storage.removeItem(getStorageKey(jobId));
      return null;
    }

    return {
      ...payload,
      resume: normalizeResume(payload.resume),
    };
  } catch {
    storage.removeItem(getStorageKey(jobId));
    return null;
  }
}

export function deletePrintJob(jobId: string): void {
  getStorage().removeItem(getStorageKey(jobId));
}

export function purgeExpiredPrintJobs(now = Date.now()): number {
  const storage = getStorage();
  const expiredKeys: string[] = [];

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(PRINT_JOB_PREFIX)) {
      continue;
    }

    const raw = storage.getItem(key);
    if (!raw) {
      expiredKeys.push(key);
      continue;
    }

    try {
      const payload = JSON.parse(raw) as PrintJobPayload;
      if (payload.expiresAt <= now) {
        expiredKeys.push(key);
      }
    } catch {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => storage.removeItem(key));
  return expiredKeys.length;
}
