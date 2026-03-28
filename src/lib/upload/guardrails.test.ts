import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_SIZE_BYTES, validateUploadFile } from "./guardrails";

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

  it("rejects files larger than 10 MB", () => {
    expect(
      validateUploadFile({
        name: "resume.docx",
        size: MAX_UPLOAD_SIZE_BYTES + 1,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toEqual({
      ok: false,
      error: "File is too large. Please upload a PDF or DOCX file under 10 MB.",
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
      error: "Unsupported file type. Please upload a PDF or DOCX file.",
    });
  });
});
