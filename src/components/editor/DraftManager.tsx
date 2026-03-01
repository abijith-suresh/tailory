import { createSignal, type Component } from "solid-js";
import { resume } from "@/store/resume";

const DraftManager: Component = () => {
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved">("idle");

  const save = async () => {
    setStatus("saving");
    // Full implementation in Phase 6 (IndexedDB)
    const { saveDraft } = await import("@/lib/storage/db");
    await saveDraft({
      id: "draft-" + Date.now(),
      name: resume.basics.name || "Untitled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumeData: JSON.parse(JSON.stringify(resume)),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={save}
      disabled={status() === "saving"}
      class="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
    >
      {status() === "saving" ? "Saving…" : status() === "saved" ? "Saved ✓" : "Save draft"}
    </button>
  );
};

export default DraftManager;
