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

describe("exportBrowserPrint", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens a print tab with a stored print job", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(window);
    const { exportBrowserPrint } = await import("./print-export");

    await exportBrowserPrint(
      createResume({
        basics: { name: "Jane Doe" },
        skills: [{ id: "skill-1", name: "TypeScript" }],
      }),
      "modern",
      { accentColor: "#1d6648" }
    );

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/print\?job=/),
      "_blank",
      "noopener,noreferrer"
    );
    expect(window.localStorage.length).toBe(1);
  });

  it("surfaces popup-blocked errors", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const { exportBrowserPrint } = await import("./print-export");

    await expect(
      exportBrowserPrint(
        createResume({
          basics: { name: "Jane Doe" },
          skills: [{ id: "skill-1", name: "TypeScript" }],
        }),
        "modern",
        { accentColor: "#1d6648" }
      )
    ).rejects.toThrow("Pop-up blocked. Please allow pop-ups to print your resume.");
  });

  it("reuses existing export validation", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(window);
    const { exportBrowserPrint } = await import("./print-export");

    await expect(
      exportBrowserPrint(createResume({ basics: { name: "Jane Doe" } }), "modern", {
        accentColor: "#1d6648",
      })
    ).rejects.toThrow(
      "Add a summary, experience, education, skills, project, or certification before exporting."
    );

    expect(openSpy).not.toHaveBeenCalled();
  });
});
