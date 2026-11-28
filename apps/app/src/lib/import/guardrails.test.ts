import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_SIZE_BYTES, validateUploadFile, validateUploadFileContent } from "./guardrails";

describe("validateUploadFile", () => {
  it("accepts supported files within the size limit", () => {
    expect(
      validateUploadFile({
        name: "resume.pdf",
        size: MAX_UPLOAD_SIZE_BYTES,
        type: "application/pdf",
      })
    ).toEqual({ ok: true, extension: "pdf" });
  });

  it("accepts JSON files within the size limit", () => {
    expect(
      validateUploadFile({
        name: "resume.json",
        size: MAX_UPLOAD_SIZE_BYTES,
        type: "application/json",
      })
    ).toEqual({ ok: true, extension: "json" });
  });

  it("rejects files larger than 10 MB", () => {
    expect(
      validateUploadFile({
        name: "resume.docx",
        size: MAX_UPLOAD_SIZE_BYTES + 1,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toEqual({
      ok: false,
      error: "File is too large. Please upload a PDF, DOCX, or JSON file under 10 MB.",
    });
  });

  it("rejects legacy .doc files by extension", () => {
    expect(
      validateUploadFile({
        name: "resume.doc",
        size: 1024,
        type: "",
      })
    ).toEqual({
      ok: false,
      error:
        "Legacy .doc files are not supported. Please save the document as .docx or PDF and try again.",
    });
  });

  it("rejects legacy Word files by MIME type", () => {
    expect(
      validateUploadFile({
        name: "resume.docx",
        size: 1024,
        type: "application/msword",
      })
    ).toEqual({
      ok: false,
      error:
        "Legacy .doc files are not supported. Please save the document as .docx or PDF and try again.",
    });
  });

  it("rejects unsupported file types", () => {
    expect(
      validateUploadFile({
        name: "resume.txt",
        size: 1024,
        type: "text/plain",
      })
    ).toEqual({
      ok: false,
      error: "Unsupported file type. Please upload a PDF, DOCX, or JSON file.",
    });
  });
});

describe("validateUploadFileContent", () => {
  it("accepts a PDF signature", async () => {
    await expect(
      validateUploadFileContent(
        { arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7").buffer },
        "pdf"
      )
    ).resolves.toEqual({ ok: true, extension: "pdf" });
  });

  it("rejects a PDF with a mismatched signature", async () => {
    await expect(
      validateUploadFileContent(
        { arrayBuffer: async () => new TextEncoder().encode("not a pdf").buffer },
        "pdf"
      )
    ).resolves.toEqual({
      ok: false,
      error: "This file does not look like a valid PDF. Please choose another PDF file.",
    });
  });

  it("accepts ZIP signatures used by DOCX files", async () => {
    await expect(
      validateUploadFileContent(
        { arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer },
        "docx"
      )
    ).resolves.toEqual({ ok: true, extension: "docx" });
  });

  it("does not pre-parse JSON content", async () => {
    await expect(
      validateUploadFileContent(
        { arrayBuffer: async () => new TextEncoder().encode("{}").buffer },
        "json"
      )
    ).resolves.toEqual({ ok: true, extension: "json" });
  });
});
