import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, isTouchFirstDevice, sanitizeFilenameBase } from "./download";

describe("sanitizeFilenameBase", () => {
  it("joins words with underscores and trims the ends", () => {
    expect(sanitizeFilenameBase("  Jane   Q Doe ")).toBe("Jane_Q_Doe");
  });

  it("falls back to resume for blank names", () => {
    expect(sanitizeFilenameBase("   ")).toBe("resume");
    expect(sanitizeFilenameBase("")).toBe("resume");
  });
});

describe("downloadBlob", () => {
  const link = { click: vi.fn(), download: "", href: "" };
  const createObjectURL = vi.fn(() => "blob:tailory");
  const revokeObjectURL = vi.fn();
  let pendingTimeouts: Array<{ fn: () => void; ms: number }>;

  beforeEach(() => {
    pendingTimeouts = [];
    link.click.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();

    vi.stubGlobal("document", { createElement: vi.fn(() => link) });
    vi.stubGlobal("window", {
      setTimeout: vi.fn((fn: () => void, ms: number) => pendingTimeouts.push({ fn, ms })),
    });
    Object.assign(globalThis.URL, { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clicks an anchor with the blob url and filename", () => {
    downloadBlob(new Blob(["x"]), "jane.json");

    expect(link.href).toBe("blob:tailory");
    expect(link.download).toBe("jane.json");
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it("revokes the object url only after a delay", () => {
    downloadBlob(new Blob(["x"]), "jane.json");

    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(pendingTimeouts).toHaveLength(1);
    expect(pendingTimeouts[0].ms).toBeGreaterThan(0);

    pendingTimeouts[0].fn();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:tailory");
  });
});

describe("isTouchFirstDevice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubPointers(coarse: boolean, anyFine: boolean) {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query === "(pointer: coarse)" ? coarse : anyFine,
      }),
    });
  }

  it("is true when the primary pointer is coarse and no fine pointer exists", () => {
    stubPointers(true, false);
    expect(isTouchFirstDevice()).toBe(true);
  });

  it("is false for a desktop with a fine primary pointer", () => {
    stubPointers(false, true);
    expect(isTouchFirstDevice()).toBe(false);
  });

  it("is false for a touch device with an attached fine pointer", () => {
    stubPointers(true, true);
    expect(isTouchFirstDevice()).toBe(false);
  });

  it("is false when matchMedia is unavailable", () => {
    vi.stubGlobal("window", {});
    expect(isTouchFirstDevice()).toBe(false);
  });
});
