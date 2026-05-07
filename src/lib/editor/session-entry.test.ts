import { beforeEach, describe, expect, it } from "vitest";

describe("editor entry modes", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("defaults to autosave restore when no explicit entry mode is queued", async () => {
    const { consumeEditorEntryMode } = await import("./session-entry");

    expect(consumeEditorEntryMode()).toBe("restore-autosave");
  });

  it("consumes one-time blank and import entry modes", async () => {
    const { consumeEditorEntryMode, queueEditorEntryMode } = await import("./session-entry");

    queueEditorEntryMode("blank");
    expect(consumeEditorEntryMode()).toBe("blank");
    expect(consumeEditorEntryMode()).toBe("restore-autosave");

    queueEditorEntryMode("import");
    expect(consumeEditorEntryMode()).toBe("import");
    expect(consumeEditorEntryMode()).toBe("restore-autosave");
  });
});
