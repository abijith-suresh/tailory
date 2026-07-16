import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTemplateFixture } from "@/lib/templates/template-fixtures";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const addFonts = vi.fn();
const addVirtualFileSystem = vi.fn();
const getBlob = vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" }));
const createPdf = vi.fn(() => ({ getBlob }));
const share = vi.fn();
const canShare = vi.fn(() => false);
const createObjectURL = vi.fn(() => "blob:tailory-pdf");
const revokeObjectURL = vi.fn();
const click = vi.fn();

vi.mock("pdfmake/build/pdfmake", () => ({
  default: {
    addFonts,
    addVirtualFileSystem,
    createPdf,
  },
}));

vi.mock("pdfmake/build/vfs_fonts", () => ({
  default: {
    "Roboto-Regular.ttf": "roboto-regular",
    "Roboto-Medium.ttf": "roboto-medium",
    "Roboto-Italic.ttf": "roboto-italic",
    "Roboto-MediumItalic.ttf": "roboto-medium-italic",
  },
}));

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

function collectNestedValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => [entry, ...collectNestedValues(entry)]);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => [entry, ...collectNestedValues(entry)]);
  }

  return [];
}

describe("exportPDF", () => {
  beforeEach(() => {
    addFonts.mockReset();
    addVirtualFileSystem.mockReset();
    getBlob.mockClear();
    createPdf.mockClear();
    share.mockReset();
    canShare.mockReset().mockReturnValue(false);
    createObjectURL.mockReset().mockReturnValue("blob:tailory-pdf");
    revokeObjectURL.mockReset();
    click.mockReset();

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        canShare,
        share,
      },
    });

    Object.assign(globalThis.URL, {
      createObjectURL,
      revokeObjectURL,
    });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: vi.fn(() => ({
          click,
        })),
      },
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        setTimeout: vi.fn((fn: () => void) => fn()),
      },
    });
  });

  it("registers embedded Roboto fonts before creating the pdf", async () => {
    const { exportPDF } = await import("./pdf-export");

    await exportPDF(
      createResume({
        basics: { name: "Jane Doe" },
        skills: [{ id: "skill-1", name: "TypeScript" }],
      }),
      "modern"
    );

    expect(addVirtualFileSystem).toHaveBeenCalledWith(
      expect.objectContaining({ "Roboto-Regular.ttf": "roboto-regular" })
    );
    expect(addFonts).toHaveBeenCalledWith(
      expect.objectContaining({
        Roboto: expect.objectContaining({ normal: "Roboto-Regular.ttf" }),
      })
    );
  });

  it("rejects obviously empty resumes before invoking pdfmake", async () => {
    const { exportPDF } = await import("./pdf-export");

    await expect(
      exportPDF(
        createResume({
          basics: { name: "Jane Doe" },
        }),
        "modern"
      )
    ).rejects.toThrow(
      "Add a summary or at least one section like experience, volunteer work, education, awards, publications, skills, languages, interests, projects, references, or certifications before exporting."
    );
    expect(createPdf).not.toHaveBeenCalled();
  });

  it("exports normalized resume content and falls back to blob download", async () => {
    const { exportPDF } = await import("./pdf-export");

    await exportPDF(
      createResume({
        basics: {
          name: "  Jane Doe  ",
          url: "janedoe.dev",
        },
        skills: [{ id: "skill-1", name: " TypeScript " }],
      }),
      "minimal"
    );

    expect(createPdf).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    const docDefinition = (createPdf.mock.calls as unknown[][]).at(0)?.[0];
    expect(docDefinition).toMatchObject({
      content: expect.arrayContaining([
        expect.objectContaining({
          stack: expect.arrayContaining([expect.objectContaining({ text: "Jane Doe" })]),
        }),
        expect.objectContaining({
          stack: expect.arrayContaining([expect.objectContaining({ text: "SKILLS" })]),
        }),
      ]),
      defaultStyle: expect.objectContaining({ font: "Roboto" }),
    });
  });

  it("uses native share when files can be shared", async () => {
    const { exportPDF } = await import("./pdf-export");

    canShare.mockReturnValue(true);

    await exportPDF(createTemplateFixture(), "modern");

    expect(share).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
  });

  it.each(["modern", "minimal", "compact-ats"] as const)(
    "creates a valid pdf definition for %s and propagates options",
    async (template) => {
      const { exportPDF } = await import("./pdf-export");

      await exportPDF(createTemplateFixture(), template, {
        accentColor: "#7c3aed",
        pageFormat: "Letter",
      });

      expect(createPdf).toHaveBeenCalledTimes(1);

      const docDefinition = (createPdf.mock.calls as unknown[][]).at(0)?.[0] as {
        content: unknown[];
        defaultStyle: { font: string };
        pageSize: string;
        styles: Record<string, { color?: string }>;
      };

      expect(docDefinition.content.length).toBeGreaterThan(0);
      expect(docDefinition.styles).toBeTruthy();
      expect(docDefinition.defaultStyle.font).toBe("Roboto");
      expect(docDefinition.pageSize).toBe("LETTER");
      expect(collectNestedValues(docDefinition.content)).not.toContain(null);
      expect(collectNestedValues(docDefinition.content)).not.toContain(undefined);

      if (template === "modern" || template === "minimal") {
        expect(docDefinition.styles.sectionTitle?.color).toBe("#7c3aed");
      }
    }
  );
});
