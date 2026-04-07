export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const LEGACY_DOC_MIME_TYPES = new Set(["application/msword"]);
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(["pdf", "docx", "json"]);

export type SupportedUploadExtension = "pdf" | "docx" | "json";

interface UploadValidationSuccess {
  ok: true;
  extension: SupportedUploadExtension;
}

interface UploadValidationFailure {
  ok: false;
  error: string;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

export function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return extension ?? "";
}

export function validateUploadFile(
  file: Pick<File, "name" | "size" | "type">
): UploadValidationResult {
  const extension = getFileExtension(file.name);

  if (extension === "doc" || LEGACY_DOC_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error:
        "Legacy .doc files are not supported. Please save the document as .docx or PDF and try again.",
    };
  }

  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: "Unsupported file type. Please upload a PDF, DOCX, or JSON file.",
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      error: "File is too large. Please upload a PDF, DOCX, or JSON file under 10 MB.",
    };
  }

  return {
    ok: true,
    extension: extension as SupportedUploadExtension,
  };
}
