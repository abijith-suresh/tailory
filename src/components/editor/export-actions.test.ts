import { afterEach, describe, expect, it, vi } from "vitest";
import { fitDocument } from "@/lib/fit/fit";
import { UNTIGHTENED } from "@/lib/fit/steps";
import { loadDocument, setAutoFit, setPageTarget } from "@/store/document";
import { setActiveVersionId } from "@/store/editor";
import { shownFitInput } from "@/store/fit";
import { sampleDocument, sampleVersion } from "@/test/resume-document";
import { RESUME_SECTION_KEYS, type ResumeSectionKey } from "@/types/document";

const exportPDF = vi.fn(async () => {});
vi.mock("@/lib/export/pdf-export", () => ({ exportPDF }));

const order: ResumeSectionKey[] = [
  "skills",
  "projects",
  ...RESUME_SECTION_KEYS.filter((key) => key !== "skills" && key !== "projects"),
];

function openVersionWithOrder() {
  loadDocument(sampleDocument([sampleVersion({ sectionOrder: order, pageTarget: 1 })]));
  setActiveVersionId("version-acme");
}

/** Section titles in the order a document prints them. */
function sectionTitles(content: unknown): string[] {
  if (Array.isArray(content)) return content.flatMap(sectionTitles);
  if (!content || typeof content !== "object") return [];
  const node = content as Record<string, unknown>;
  const own = node.style === "sectionTitle" && typeof node.text === "string" ? [node.text] : [];
  return [...own, ...sectionTitles(node.stack), ...sectionTitles(node.columns)];
}

afterEach(() => {
  setActiveVersionId(null);
  exportPDF.mockClear();
});

describe("a version's section order", () => {
  it("reaches the PDF export, with the version's page target", async () => {
    openVersionWithOrder();
    setAutoFit("version-acme", false);
    const { exportShownPdf } = await import("./export-actions");

    await exportShownPdf();

    expect(exportPDF).toHaveBeenCalledWith(expect.anything(), "minimal", {
      accentColor: expect.any(String),
      sectionOrder: order,
      pageFit: { pageTarget: 1, autoFit: false },
      versionName: "Acme",
    });
  });

  it("reaches the preview", () => {
    openVersionWithOrder();
    const titles = sectionTitles(fitDocument(shownFitInput(), UNTIGHTENED).content);

    expect(titles.slice(0, 2)).toEqual(["SKILLS", "PROJECTS"]);
  });

  it("leaves the master in the template's order, with the master's target", async () => {
    openVersionWithOrder();
    setActiveVersionId(null);
    setPageTarget(null, 2);
    const { exportShownPdf } = await import("./export-actions");

    await exportShownPdf();

    expect(exportPDF).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        sectionOrder: undefined,
        pageFit: { pageTarget: 2, autoFit: true },
      })
    );
    expect(sectionTitles(fitDocument(shownFitInput(), UNTIGHTENED).content)[0]).toBe("SUMMARY");
  });
});
