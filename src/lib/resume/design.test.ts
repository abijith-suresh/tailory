import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_FORMAT, resolveResumeDesignSettings } from "./design";

describe("resume design settings", () => {
  it("defaults to A4 page sizing", () => {
    const design = resolveResumeDesignSettings({ template: "modern" });

    expect(design.pageFormat).toBe(DEFAULT_PAGE_FORMAT);
    expect(design.pageSize).toBe("A4");
    expect(design.previewPageMinHeight).toBe(842);
  });

  it("maps Letter page sizing for preview and export parity", () => {
    const design = resolveResumeDesignSettings({
      template: "modern",
      pageFormat: "Letter",
    });

    expect(design.pageFormat).toBe("Letter");
    expect(design.pageSize).toBe("LETTER");
    expect(design.previewPageMinHeight).toBe(816);
    expect(design.pageWidth).toBe(612);
  });
});
