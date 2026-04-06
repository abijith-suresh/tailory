import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const addFontContainer = vi.fn();
const addVirtualFileSystem = vi.fn();
const download = vi.fn();
const createPdf = vi.fn(() => ({ download }));

vi.mock("pdfmake/build/pdfmake", () => ({
  default: {
    addFontContainer,
    addVirtualFileSystem,
    createPdf,
  },
}));

vi.mock("pdfmake/build/vfs_fonts", () => ({
  default: {
    "Roboto-Regular.ttf": "roboto-regular",
  },
}));

vi.mock("pdfmake/build/standard-fonts/Helvetica", () => ({
  default: {
    fonts: {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    },
    vfs: {
      "data/Helvetica.afm": "helvetica-afm",
    },
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

describe("exportPDF", () => {
  beforeEach(() => {
    addFontContainer.mockReset();
    addVirtualFileSystem.mockReset();
    download.mockReset();
    createPdf.mockClear();
  });

  it("registers export fonts before creating the pdf", async () => {
    const { exportPDF } = await import("./pdf-export");

    await exportPDF(
      createResume({
        basics: { name: "Jane Doe" },
        skills: [{ id: "skill-1", name: "TypeScript" }],
      }),
      "modern"
    );

    expect(addVirtualFileSystem).toHaveBeenCalledWith({ "Roboto-Regular.ttf": "roboto-regular" });
    expect(addFontContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        vfs: expect.objectContaining({ "data/Helvetica.afm": "helvetica-afm" }),
        fonts: expect.objectContaining({ Helvetica: expect.any(Object) }),
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
      "Add a summary, experience, education, skills, project, or certification before exporting."
    );
    expect(createPdf).not.toHaveBeenCalled();
  });

  it("exports normalized resume content and filename", async () => {
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
    expect(download).toHaveBeenCalledWith("Jane_Doe_resume.pdf");
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
      defaultStyle: expect.objectContaining({ font: "Helvetica" }),
    });
  });
});
