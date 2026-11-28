// Saves an editor's work a moment after the last edit. No Solid here, so it tests with fake timers.

/** What one save attempt came to. */
export type SaveOutcome = "saved" | "conflict" | "failed";

export type AutosaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

export type AutosaveOptions = {
  /** Sends the latest state. Reads it when called, so it always sends the newest edits. */
  save: () => Promise<SaveOutcome>;
  onStatus: (status: AutosaveStatus) => void;
  /** How long edits pause before a save. */
  delay?: number;
};

export type Autosave = {
  /** An edit happened: save after the pause. */
  changed: () => void;
  /** Saves now if anything is waiting; resolves once the server is up to date (or can't be). */
  flush: () => Promise<void>;
  /** Edits are waiting or a save is under way. */
  pending: () => boolean;
  /** The editor now shows what the server has: nothing waits, and any conflict is over. */
  reset: () => void;
  /** After a conflict, save the waiting edits on top of the latest profile. */
  retry: () => Promise<void>;
  dispose: () => void;
};

/**
 * Debounced saving. One save runs at a time; edits made meanwhile go in the next one. A failed
 * save keeps the edits waiting for the next edit or flush. A conflict stops saving until reset()
 * or retry(), so the editor never overwrites a change made elsewhere without asking.
 */
export function createAutosave({ save, onStatus, delay = 800 }: AutosaveOptions): Autosave {
  let dirty = false;
  let conflicted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;

  const send = async (): Promise<SaveOutcome> => {
    dirty = false;
    onStatus("saving");
    let outcome: SaveOutcome;
    try {
      outcome = await save();
    } catch {
      outcome = "failed";
    }
    if (outcome === "saved") {
      onStatus(dirty ? "unsaved" : "saved");
    } else if (outcome === "conflict") {
      dirty = true;
      conflicted = true;
      onStatus("conflict");
    } else {
      dirty = true;
      onStatus("error");
    }
    return outcome;
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), delay);
  };

  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    while (inFlight) await inFlight;
    if (!dirty || conflicted) return;
    const run = send();
    inFlight = run.then(
      () => {},
      () => {}
    );
    const outcome = await run.catch((): SaveOutcome => "failed");
    inFlight = null;
    // Edits made during a save go out after the usual pause. A failed save waits for the next
    // edit or flush instead of retrying on its own.
    if (outcome === "saved" && dirty) schedule();
  };

  return {
    changed() {
      dirty = true;
      if (conflicted) return;
      onStatus("unsaved");
      schedule();
    },
    flush,
    pending: () => dirty || inFlight !== null,
    reset() {
      clearTimeout(timer);
      dirty = false;
      conflicted = false;
      onStatus("saved");
    },
    async retry() {
      conflicted = false;
      dirty = true;
      await flush();
    },
    dispose() {
      clearTimeout(timer);
    },
  };
}
