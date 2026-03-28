import { describe, expect, it, vi } from "vitest";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const download = vi.fn();
const createPdf = vi.fn(() => ({ download }));

vi.mock("pdfmake/build/pdfmake", () => ({
  default: {
    createPdf,
    vfs: {},
  },
}));

vi.mock("pdfmake/build/vfs_fonts", () => ({
  default: {
    vfs: {},
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
    download.mockReset();
    createPdf.mockClear();

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
    });
  });
});
