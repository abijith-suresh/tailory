import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

const channelMessages = new Map<string, unknown[]>();

class BroadcastChannelMock {
  name: string;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  close() {
    channelMessages.delete(this.name);
  }

  postMessage(message: unknown) {
    const messages = channelMessages.get(this.name) ?? [];
    messages.push(message);
    channelMessages.set(this.name, messages);
  }
}

vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);

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
    channelMessages.clear();
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
    const url = openSpy.mock.calls[0]?.[0] as string;
    const jobId = new URL(url, "https://tailory.test").searchParams.get("job");
    expect(jobId).toBeTruthy();
    expect(channelMessages.get(`tailory:print-job:${jobId}`) ?? []).toEqual([]);
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

    expect(window.localStorage.length).toBe(0);
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
