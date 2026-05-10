import { describe, expect, it } from "vitest";

import { EMPTY_RESUME } from "@/types/resume";

import {
  buildSharedResumeUrl,
  decodeSharedResumePayload,
  encodeSharedResumePayload,
  MAX_SHARED_URL_LENGTH,
} from "./url-share";

describe("shared resume URLs", () => {
  it("round-trips a resume through a URL-safe payload", () => {
    const resume = {
      ...structuredClone(EMPTY_RESUME),
      basics: {
        ...structuredClone(EMPTY_RESUME.basics),
        name: "Jane Doe",
        summary: "Frontend engineer",
      },
      work: [{ id: "work-1", name: "Acme", position: "Engineer" }],
    };

    const payload = encodeSharedResumePayload(resume);
    const decoded = decodeSharedResumePayload(payload);

    expect(decoded.basics).toMatchObject({
      name: "Jane Doe",
      summary: "Frontend engineer",
    });
    expect(decoded.work?.[0]).toMatchObject({
      name: "Acme",
      position: "Engineer",
    });
  });

  it("rejects invalid payloads with actionable errors", () => {
    expect(() => decodeSharedResumePayload("not-a-real-share-payload")).toThrowError(
      "This shared resume link is invalid or corrupted."
    );
  });

  it("builds a full share URL and enforces a practical size limit", () => {
    const url = buildSharedResumeUrl("https://tailory.dev/editor", {
      ...structuredClone(EMPTY_RESUME),
      basics: {
        ...structuredClone(EMPTY_RESUME.basics),
        name: "Jane Doe",
      },
    });

    expect(url.startsWith("https://tailory.dev/editor?share=")).toBe(true);
    expect(url.length).toBeLessThan(MAX_SHARED_URL_LENGTH);

    const oversizedResume = {
      ...structuredClone(EMPTY_RESUME),
      basics: {
        ...structuredClone(EMPTY_RESUME.basics),
        name: "Jane Doe",
        summary: Array.from({ length: 3_000 }, (_, index) => `detail-${index}`).join(" "),
      },
    };

    expect(() => buildSharedResumeUrl("https://tailory.dev/editor", oversizedResume)).toThrowError(
      "This resume is too large to share safely as a URL."
    );
  });
});
