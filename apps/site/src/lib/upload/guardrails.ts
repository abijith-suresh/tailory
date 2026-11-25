export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const LEGACY_DOC_MIME_TYPES = new Set(["application/msword"]);
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(["pdf", "docx", "json"]);

export type SupportedUploadExtension = "pdf" | "docx" | "json";

const PDF_SIGNATURE = "%PDF-";
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
] as const;

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

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

/**
 * Checks the leading bytes of binary uploads so an extension alone cannot
 * route arbitrary content into a document parser.
 */
export async function validateUploadFileContent(
  file: Pick<File, "arrayBuffer">,
  extension: SupportedUploadExtension
): Promise<UploadValidationResult> {
  if (extension === "json") {
    return { ok: true, extension };
  }

  let bytes: Uint8Array;

  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return {
      ok: false,
      error: "Unable to read this file. Please choose another PDF or DOCX file.",
    };
  }

  if (extension === "pdf") {
    const header = new TextDecoder().decode(bytes.subarray(0, PDF_SIGNATURE.length));
    if (header === PDF_SIGNATURE) {
      return { ok: true, extension };
    }

    return {
      ok: false,
      error: "This file does not look like a valid PDF. Please choose another PDF file.",
    };
  }

  if (ZIP_SIGNATURES.some((signature) => startsWithBytes(bytes, signature))) {
    return { ok: true, extension };
  }

  return {
    ok: false,
    error: "This file does not look like a valid DOCX file. Please choose another DOCX file.",
  };
}
