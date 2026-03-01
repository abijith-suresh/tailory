import { type Component, createSignal, Show } from "solid-js";
import ProcessingIndicator from "@/components/ui/ProcessingIndicator";
import { loadResume } from "@/store/resume";

type Status = "idle" | "processing" | "error";

const FileUpload: Component = () => {
  const [status, setStatus] = createSignal<Status>("idle");
  const [errorMsg, setErrorMsg] = createSignal("");
  const [isDragOver, setIsDragOver] = createSignal(false);

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx" && ext !== "doc") {
      setErrorMsg("Unsupported file type. Please upload a PDF or DOCX file.");
      setStatus("error");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    try {
      let rawText: string;

      if (ext === "pdf") {
        const { extractTextFromPDF } = await import("@/lib/extraction/pdf");
        rawText = await extractTextFromPDF(file);
      } else {
        const { extractTextFromDOCX } = await import("@/lib/extraction/docx");
        rawText = await extractTextFromDOCX(file);
      }

      const { parseResume } = await import("@/lib/parser/resume-parser");
      const result = await parseResume(rawText);

      loadResume(result.data);

      // Navigate to editor
      window.location.href = "/editor";
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to process file. Please try a different file."
      );
      setStatus("error");
    }
  };

  const handleFileInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const startFromScratch = () => {
    window.location.href = "/editor";
  };

  return (
    <div class="space-y-6">
      <Show when={status() === "processing"}>
        <ProcessingIndicator message="Extracting and parsing your resume…" />
      </Show>

      <Show when={status() !== "processing"}>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          class={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragOver()
              ? "border-indigo-400 bg-indigo-950/20"
              : "border-white/20 bg-white/5 hover:border-indigo-500/50"
          }`}
        >
          <div class="mb-4 flex justify-center">
            <div class="rounded-full bg-indigo-900/50 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-indigo-400"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>

          <p class="mb-2 text-base font-medium text-gray-200">Drop your resume here</p>
          <p class="mb-6 text-sm text-gray-400">PDF or DOCX · Max 10 MB</p>

          <label
            for="file-input"
            class="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
          >
            Choose file
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              onInput={handleFileInput}
              class="sr-only"
            />
          </label>
        </div>

        <Show when={status() === "error"}>
          <div
            role="alert"
            class="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300"
          >
            {errorMsg()}
          </div>
        </Show>

        <div class="text-center">
          <span class="text-sm text-gray-500">or</span>
          <button
            type="button"
            onClick={startFromScratch}
            class="ml-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            start from scratch
          </button>
        </div>
      </Show>
    </div>
  );
};

export default FileUpload;
