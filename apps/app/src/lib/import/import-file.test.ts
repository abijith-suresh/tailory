import { describe, expect, it, vi } from "vitest";

vi.mock("./pdf", () => ({
  extractTextFromPDF: vi.fn(async () =>
    [
      "Grace Hopper",
      "grace@example.com",
      "",
      "EXPERIENCE",
      "Rear Admiral, US Navy",
      "1967 - 1986",
    ].join("\n")
  ),
}));

import { describeFound, readResumeFile } from "./import-file";

const file = (content: string, name: string, type = "") => new File([content], name, { type });

describe("readResumeFile", () => {
  it("reads a JSON Resume file and names the fields it leaves out", async () => {
    const outcome = await readResumeFile(
      file(
        JSON.stringify({
          basics: { name: "Ada Lovelace" },
          work: [{ name: "Analytical Engine", position: "Programmer", highlights: ["Wrote it"] }],
          meta: { version: "1" },
        }),
        "ada.json",
        "application/json"
      )
    );
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.preview).toMatchObject({ fileName: "ada.json", kind: "json" });
    expect(outcome.preview.resume.basics.name).toBe("Ada Lovelace");
    expect(outcome.preview.resume.work?.[0]?.highlights?.[0]?.text).toBe("Wrote it");
    expect(outcome.preview.ignoredFields).toEqual(["meta"]);
    expect(outcome.preview.confidence).toBeUndefined();
  });

  it("reads a PDF's text with the parser and reports its confidence", async () => {
    const outcome = await readResumeFile(file("%PDF-1.4 ...", "grace.pdf", "application/pdf"));
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.preview.kind).toBe("pdf");
    expect(outcome.preview.resume.basics.name).toBe("Grace Hopper");
    expect(outcome.preview.confidence).toBeGreaterThan(0);
  });

  it("turns bad files into a message instead of throwing", async () => {
    expect(await readResumeFile(file("hello", "notes.txt"))).toMatchObject({ ok: false });
    expect(await readResumeFile(file("not a pdf", "cv.pdf"))).toMatchObject({
      ok: false,
      error: expect.stringContaining("valid PDF"),
    });
    expect(await readResumeFile(file("{oops", "cv.json"))).toMatchObject({ ok: false });
  });
});

describe("describeFound", () => {
  it("counts each section found, in reading order, and the bullets", () => {
    expect(
      describeFound({
        basics: { name: "Ada" },
        work: [
          { id: "1", name: "A", position: "B", highlights: [{ id: "h", text: "x" }] },
          { id: "2", name: "C", position: "D" },
        ],
        skills: [{ id: "s", name: "Go" }],
        education: [],
      })
    ).toEqual(["2 jobs", "1 skill group", "1 bullet"]);
  });
});
