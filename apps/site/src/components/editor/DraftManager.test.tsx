import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DraftManager from "@/components/editor/DraftManager";
import type { ResumeDraft } from "@/lib/storage/db";
import {
  draftStorageError,
  loadResume,
  otherTabActive,
  resume,
  setDraftStorageError,
  setResume,
} from "@/store/resume";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

const db = vi.hoisted(() => ({
  available: true,
  readFails: false,
  drafts: new Map<string, ResumeDraft>(),
  saveDraft: vi.fn(),
  listDrafts: vi.fn(),
  deleteDraft: vi.fn(),
}));

vi.mock("@/lib/storage/db", () => ({
  AUTOSAVE_DRAFT_ID: "autosave",
  isDraftStorageAvailable: async () => db.available,
  getDraft: async (id: string) => (db.readFails ? null : db.drafts.get(id)),
  saveDraft: db.saveDraft,
  listDrafts: db.listDrafts,
  deleteDraft: db.deleteDraft,
}));

function resumeNamed(name: string): ResumeSchema {
  const data = structuredClone(EMPTY_RESUME);
  data.basics.name = name;
  return data;
}

function seedDraft(id: string, name: string) {
  db.drafts.set(id, { id, name, createdAt: 1, updatedAt: 1, resumeData: resumeNamed(name) });
}

const autosaveCalls = () => db.saveDraft.mock.calls.filter(([draft]) => draft.id === "autosave");

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

async function renderManager() {
  const result = render(() => <DraftManager dark />);
  await flush();
  return result;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  db.available = true;
  db.readFails = false;
  db.drafts.clear();
  db.saveDraft.mockImplementation(async (draft: ResumeDraft) => {
    db.drafts.set(draft.id, draft);
    return true;
  });
  db.listDrafts.mockImplementation(async () => Array.from(db.drafts.values()));
  db.deleteDraft.mockImplementation(async (id: string) => db.drafts.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  db.saveDraft.mockReset();
  db.listDrafts.mockReset();
  db.deleteDraft.mockReset();
  loadResume(structuredClone(EMPTY_RESUME));
  setDraftStorageError("");
});

describe("DraftManager autosave", () => {
  it("saves pending edits right away when the page is closed", async () => {
    await renderManager();

    setResume("basics", "name", "Jane");
    await flush();
    expect(autosaveCalls()).toHaveLength(0);

    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(autosaveCalls()).toHaveLength(1);
    expect(db.drafts.get("autosave")?.resumeData.basics.name).toBe("Jane");
  });

  it("saves pending edits right away when the tab is hidden", async () => {
    await renderManager();
    setResume("basics", "name", "Jane");
    await flush();

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();

    expect(autosaveCalls()).toHaveLength(1);
  });

  it("does not save a change that was undone before the delay ran out", async () => {
    seedDraft("autosave", "Jane");
    await renderManager();
    expect(resume.basics.name).toBe("Jane");

    setResume("basics", "name", "Janet");
    setResume("basics", "name", "Jane");
    await vi.advanceTimersByTimeAsync(2000);

    expect(autosaveCalls()).toHaveLength(0);
  });

  it("does not save after it unmounts", async () => {
    const { unmount } = await renderManager();
    setResume("basics", "name", "Jane");
    await flush();

    unmount();
    await vi.advanceTimersByTimeAsync(2000);
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(autosaveCalls()).toHaveLength(0);
  });

  it("keeps retrying after a failed write and says how to keep a copy", async () => {
    const { getByText, getByRole } = await renderManager();
    db.saveDraft.mockResolvedValueOnce(false);

    setResume("basics", "name", "Jane");
    await vi.advanceTimersByTimeAsync(2000);

    expect(draftStorageError()).toBe(
      "Couldn't save your changes in this browser. Export JSON to keep a copy."
    );
    expect(getByText("Not saved")).toBeInTheDocument();
    expect(getByRole("status")).toHaveTextContent("Changes not saved");

    setResume("basics", "name", "Jane Doe");
    await vi.advanceTimersByTimeAsync(2000);

    expect(autosaveCalls()).toHaveLength(2);
    expect(db.drafts.get("autosave")?.resumeData.basics.name).toBe("Jane Doe");
    expect(draftStorageError()).toBe("");
    expect(getByRole("status")).toHaveTextContent("Changes saved");
  });

  it("says what to do when drafts aren't available at all", async () => {
    db.available = false;
    const { getByLabelText } = await renderManager();

    expect(draftStorageError()).toBe(
      "Drafts aren't available in this browser, so changes won't be saved. Export JSON to keep a copy."
    );
    expect(getByLabelText("Open saved drafts")).toBeDisabled();
  });
});

describe("DraftManager startup", () => {
  it("does not overwrite the saved resume when it can't be read", async () => {
    seedDraft("autosave", "Jane");
    db.readFails = true;
    await renderManager();
    await vi.advanceTimersByTimeAsync(2000);

    setResume("basics", "name", "Alex");
    await vi.advanceTimersByTimeAsync(2000);
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(autosaveCalls()).toHaveLength(0);
    expect(db.drafts.get("autosave")?.resumeData.basics.name).toBe("Jane");
    expect(draftStorageError()).toBe(
      "Couldn't load your saved resume, so changes here won't be saved. Reload the page to try again."
    );
  });

  it("does not save the empty resume before anything is edited", async () => {
    await renderManager();
    await vi.advanceTimersByTimeAsync(2000);
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(autosaveCalls()).toHaveLength(0);
  });
});

describe("DraftManager with the editor open in two tabs", () => {
  let otherTab: BroadcastChannel;
  let otherTabMessages: unknown[];

  beforeEach(() => {
    otherTabMessages = [];
    otherTab = new BroadcastChannel("tailory-editor");
    otherTab.onmessage = (event) => otherTabMessages.push(event.data);
  });

  afterEach(() => {
    otherTab.close();
  });

  async function openInOtherTab() {
    otherTab.postMessage("active");
    await vi.waitFor(() => expect(otherTabActive()).not.toBeNull());
  }

  it("tells tabs that are already open to stop saving", async () => {
    await renderManager();

    await vi.waitFor(() => expect(otherTabMessages).toEqual(["active"]));
  });

  it("saves pending edits and stops autosaving when the editor opens in another tab", async () => {
    await renderManager();
    setResume("basics", "name", "Jane");
    await flush();

    await openInOtherTab();
    await flush();
    expect(autosaveCalls()).toHaveLength(1);
    expect(db.drafts.get("autosave")?.resumeData.basics.name).toBe("Jane");

    setResume("basics", "name", "Jane Doe");
    await vi.advanceTimersByTimeAsync(2000);
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(autosaveCalls()).toHaveLength(1);
  });

  it("reloads the saved resume and saves again after taking over", async () => {
    await renderManager();
    await openInOtherTab();
    seedDraft("autosave", "Alex");
    otherTabMessages.length = 0;

    otherTabActive()?.takeOver();
    await flush();

    expect(otherTabActive()).toBeNull();
    expect(resume.basics.name).toBe("Alex");
    await vi.waitFor(() => expect(otherTabMessages).toEqual(["active"]));

    setResume("basics", "label", "Engineer");
    await vi.advanceTimersByTimeAsync(2000);

    expect(autosaveCalls()).toHaveLength(1);
    expect(db.drafts.get("autosave")?.resumeData.basics.label).toBe("Engineer");
  });
});

describe("DraftManager named drafts", () => {
  it("updates the existing draft when saving under the same name", async () => {
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now++);
    const { getByRole } = await renderManager();
    setResume("basics", "name", "Jane");

    const save = getByRole("button", { name: "Save draft" });
    fireEvent.click(save);
    await flush();
    setResume("basics", "label", "Engineer");
    fireEvent.click(save);
    await flush();

    const named = [...db.drafts.values()].filter((draft) => draft.id !== "autosave");
    expect(named).toHaveLength(1);
    expect(named[0].resumeData.basics.label).toBe("Engineer");
  });

  it("shows an error instead of an empty list when drafts can't be loaded", async () => {
    db.listDrafts.mockResolvedValue(null);
    const { getByRole, queryByText } = await renderManager();

    fireEvent.click(getByRole("button", { name: "Drafts" }));
    await flush();

    expect(getByRole("alert")).toHaveTextContent("Couldn't load your drafts. Try again.");
    expect(queryByText("No saved drafts")).toBeNull();
  });

  it("closes on Escape and returns focus to the button that opened it", async () => {
    const { getByLabelText, queryByText } = await renderManager();
    const trigger = getByLabelText("Open saved drafts");
    trigger.focus();

    fireEvent.click(trigger);
    await flush();
    expect(queryByText("Saved Drafts")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(queryByText("Saved Drafts")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("asks before deleting a draft", async () => {
    seedDraft("draft-1", "Alex");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { getByRole, getByLabelText, queryByText } = await renderManager();

    fireEvent.click(getByRole("button", { name: "Drafts" }));
    await flush();
    fireEvent.click(getByLabelText("Delete draft"));
    await flush();

    expect(confirm).toHaveBeenCalledWith(`Delete "Alex"? This can't be undone.`);
    expect(db.deleteDraft).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(getByLabelText("Delete draft"));
    await flush();

    expect(db.deleteDraft).toHaveBeenCalledWith("draft-1");
    expect(queryByText("No saved drafts")).toBeInTheDocument();
  });

  it("keeps a copy of the current resume before loading a draft over it", async () => {
    seedDraft("draft-1", "Alex");
    const { getByRole, getByText } = await renderManager();
    setResume("basics", "name", "Jane");

    fireEvent.click(getByRole("button", { name: "Drafts" }));
    await flush();
    fireEvent.click(getByText("Alex"));
    await flush();

    expect(resume.basics.name).toBe("Alex");
    const copy = [...db.drafts.values()].find((draft) => draft.id.startsWith("copy-"));
    expect(copy?.name).toBe("Jane (before loading draft)");
    expect(copy?.resumeData.basics.name).toBe("Jane");
  });
});
