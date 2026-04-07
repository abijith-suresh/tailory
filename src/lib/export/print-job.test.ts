import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function createResume(overrides?: DeepPartial<ResumeSchema>): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    ...overrides,
    basics: {
      ...structuredClone(EMPTY_RESUME.basics),
      ...overrides?.basics,
      location: {
        ...structuredClone(EMPTY_RESUME.basics.location ?? {}),
        ...overrides?.basics?.location,
      },
    },
  };
}

describe("print job storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("stores a normalized print job payload", async () => {
    const { createPrintJob, readPrintJob } = await import("./print-job");

    const { jobId } = createPrintJob(
      createResume({
        basics: {
          name: "  Jane Doe  ",
          url: "janedoe.dev",
        },
        skills: [{ id: "skill-1", name: " TypeScript " }],
      }),
      "modern",
      "#1d6648"
    );

    expect(readPrintJob(jobId)).toMatchObject({
      accentColor: "#1d6648",
      filename: "Jane_Doe_resume.pdf",
      resume: {
        basics: expect.objectContaining({
          name: "Jane Doe",
          url: "https://janedoe.dev",
        }),
        skills: [expect.objectContaining({ name: "TypeScript" })],
      },
      template: "modern",
    });
  });

  it("purges expired jobs and ignores malformed payloads", async () => {
    const now = new Date("2026-04-07T09:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const { createPrintJob, purgeExpiredPrintJobs, readPrintJob } = await import("./print-job");

    const { jobId: activeJobId } = createPrintJob(
      createResume({
        basics: { name: "Jane Doe" },
        skills: [{ id: "skill-1", name: "TypeScript" }],
      }),
      "minimal",
      "#123456"
    );
    window.localStorage.setItem("tailory:print-job:broken", "not-json");

    vi.advanceTimersByTime(11 * 60 * 1000);

    expect(purgeExpiredPrintJobs()).toBeGreaterThanOrEqual(2);
    expect(readPrintJob(activeJobId)).toBeNull();
  });
});
