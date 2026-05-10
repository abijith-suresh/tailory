import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeSchema } from "@/types/resume";

export const MAX_SHARED_URL_LENGTH = 7_500;

export function encodeSharedResumePayload(resume: ResumeSchema): string {
  return compressToEncodedURIComponent(JSON.stringify(normalizeResume(resume)));
}

export function decodeSharedResumePayload(payload: string): ResumeSchema {
  const decoded = decompressFromEncodedURIComponent(payload);

  if (!decoded) {
    throw new Error("This shared resume link is invalid or corrupted.");
  }

  try {
    return normalizeResume(JSON.parse(decoded) as ResumeSchema);
  } catch {
    throw new Error("This shared resume link is invalid or corrupted.");
  }
}

export function buildSharedResumeUrl(baseUrl: string, resume: ResumeSchema): string {
  const url = new URL(baseUrl);
  url.searchParams.set("share", encodeSharedResumePayload(resume));

  if (url.toString().length > MAX_SHARED_URL_LENGTH) {
    throw new Error("This resume is too large to share safely as a URL.");
  }

  return url.toString();
}

export function readSharedPayloadFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("share");
}
