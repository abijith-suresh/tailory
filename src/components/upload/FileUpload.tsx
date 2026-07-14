import { type Component, createSignal, Show } from "solid-js";

import ProcessingIndicator from "@/components/ui/ProcessingIndicator";
import { validateUploadFile } from "@/lib/upload/guardrails";
import { importResumeFile } from "@/lib/upload/import-resume";
import { loadResume, setImportFeedback } from "@/store/resume";

type Status = "idle" | "processing" | "error";

const FileUpload: Component = () => {
  const [status, setStatus] = createSignal<Status>("idle");
  const [errorMsg, setErrorMsg] = createSignal("");
  const [isDragOver, setIsDragOver] = createSignal(false);

  const processFile = async (file: File) => {
    // Fast synchronous validation first — keeps error visible alongside the drop zone
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setErrorMsg(validation.error);
      setStatus("error");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    const outcome = await importResumeFile(file, validation.extension);
    if (!outcome.success) {
      setErrorMsg(outcome.error);
      setStatus("error");
      return;
    }

    if (outcome.feedback) {
      setImportFeedback(outcome.feedback);
    }
    loadResume(outcome.resume);

    // Navigate to editor with client-side transition
    const { navigate } = await import("astro:transitions/client");
    navigate("/editor");
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

  const startFromScratch = async () => {
    const { navigate } = await import("astro:transitions/client");
    navigate("/editor");
  };

  return (
    <div class="space-y-6">
      <Show when={status() === "processing"}>
        <ProcessingIndicator message="Extracting and parsing your resume…" />
      </Show>

      <Show when={status() !== "processing"}>
        <button
          type="button"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          class={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragOver()
              ? "border-[#2d9469] bg-[#1d6648]/10"
              : "border-white/20 bg-white/5 hover:border-[#1d6648]/50"
          }`}
        >
          <div class="mb-4 flex justify-center">
            <div class="rounded-full bg-[#1d6648]/50 p-4">
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
                class="text-[#4ade80]"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>

          <p class="mb-2 text-base font-medium text-gray-200">Drop your resume here</p>
          <p class="mb-6 text-sm text-gray-400">PDF, DOCX, or JSON · Max 10 MB</p>

          <label
            for="file-input"
            class="cursor-pointer rounded-lg bg-[#1d6648] px-6 py-2.5 text-sm font-medium text-white transition-colors active:scale-[0.98] hover:bg-[#155236] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#1d6648] focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
          >
            Choose file
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.json"
              onInput={handleFileInput}
              class="sr-only"
            />
          </label>
        </button>

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
            class="ml-2 text-sm font-medium text-[#4ade80] transition-colors hover:text-white hover:underline"
          >
            start from scratch
          </button>
        </div>
      </Show>
    </div>
  );
};

export default FileUpload;
