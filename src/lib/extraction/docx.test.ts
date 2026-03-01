import { describe, expect, it } from "vitest";

describe("docx extraction module", () => {
  it("exports extractTextFromDOCX function", async () => {
    const mod = await import("./docx");
    expect(typeof mod.extractTextFromDOCX).toBe("function");
  });
});
