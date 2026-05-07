export type EditorEntryMode = "restore-autosave" | "blank" | "import";

const EDITOR_ENTRY_MODE_KEY = "tailory:editor-entry-mode";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function queueEditorEntryMode(mode: Exclude<EditorEntryMode, "restore-autosave">): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(EDITOR_ENTRY_MODE_KEY, mode);
}

export function consumeEditorEntryMode(): EditorEntryMode {
  if (!isBrowser()) {
    return "restore-autosave";
  }

  const queuedMode = window.sessionStorage.getItem(EDITOR_ENTRY_MODE_KEY);
  window.sessionStorage.removeItem(EDITOR_ENTRY_MODE_KEY);

  return queuedMode === "blank" || queuedMode === "import" ? queuedMode : "restore-autosave";
}
