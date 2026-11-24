import { fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ResumeMenu from "@/components/editor/ResumeMenu";
import { ConfirmHost } from "@/components/ui/confirm";
import type { ResumeDraft } from "@/lib/storage/db";
import { createDocument } from "@/lib/versions/document";
import { loadDocument } from "@/store/document";
import {
  importError,
  importFeedback,
  resume,
  setImportError,
  setImportFeedback,
  setResume,
} from "@/store/resume";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

const db = vi.hoisted(() => ({
  drafts: new Map<string, ResumeDraft>(),
  saveDraft: vi.fn(),
  listDrafts: vi.fn(),
  deleteDraft: vi.fn(),
}));

const upload = vi.hoisted(() => ({ importResumeFile: vi.fn() }));

vi.mock("@/lib/storage/db", () => ({
  AUTOSAVE_DRAFT_ID: "autosave",
  isDraftStorageAvailable: async () => true,
  getDraft: async (id: string) => db.drafts.get(id),
  saveDraft: db.saveDraft,
  listDrafts: db.listDrafts,
  deleteDraft: db.deleteDraft,
}));
vi.mock("@/lib/upload/import-resume", () => upload);

function resumeNamed(name: string): ResumeSchema {
  const data = structuredClone(EMPTY_RESUME);
  data.basics.name = name;
  return data;
}

function seedDraft(id: string, name: string) {
  db.drafts.set(id, {
    id,
    name,
    createdAt: 1,
    updatedAt: 1,
    document: createDocument(resumeNamed(name)),
  });
}

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

const autosave = { status: () => "saved" as const, storageAvailable: () => true };

function renderMenu() {
  return render(() => (
    <>
      <ResumeMenu autosave={autosave} />
      <ConfirmHost />
    </>
  ));
}

async function openCopies() {
  fireEvent.click(screen.getByRole("button", { name: /^Resume:/ }));
  await flush();
  fireEvent.click(screen.getByRole("menuitem", { name: "Saved copies" }));
  await flush();
}

function chooseFile(input: HTMLElement) {
  const file = new File(["{}"], "resume.json", { type: "application/json" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.input(input);
}

beforeEach(() => {
  db.drafts.clear();
  db.saveDraft.mockImplementation(async (draft: ResumeDraft) => {
    db.drafts.set(draft.id, draft);
    return true;
  });
  db.listDrafts.mockImplementation(async () => Array.from(db.drafts.values()));
  db.deleteDraft.mockImplementation(async (id: string) => db.drafts.delete(id));
});

afterEach(() => {
  vi.resetAllMocks();
  loadDocument(createDocument(EMPTY_RESUME));
  setImportError("");
  setImportFeedback(null);
});

describe("ResumeMenu", () => {
  it("names the resume and shows the save state", () => {
    setResume("basics", "name", "Jane");
    renderMenu();

    expect(screen.getByRole("button", { name: "Resume: Jane" })).toHaveAccessibleDescription(
      "Saved in this browser"
    );
  });

  it("saves a copy, updating the one with the same name", async () => {
    setResume("basics", "name", "Jane");
    renderMenu();
    const save = async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Resume:/ }));
      await flush();
      fireEvent.click(screen.getByRole("menuitem", { name: /Save a copy/ }));
      await flush();
    };

    await save();
    setResume("basics", "label", "Engineer");
    await save();

    expect([...db.drafts.values()]).toEqual([
      expect.objectContaining({ name: "Jane", document: expect.anything() }),
    ]);
    expect([...db.drafts.values()][0]?.document.master.basics.label).toBe("Engineer");
  });
});

describe("ResumeMenu import", () => {
  it("says what to do when import throws", async () => {
    upload.importResumeFile.mockRejectedValue(new Error("boom"));
    renderMenu();

    chooseFile(screen.getByLabelText("Import resume file"));
    await flush();

    expect(importError()).toBe("Couldn't import this file. Try again or choose a different file.");
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved in this browser");
  });

  it("keeps a copy of the current resume, then shows what was found", async () => {
    const feedback = {
      confidence: 90,
      work: 1,
      education: 0,
      skills: 0,
      projects: 0,
      certificates: 0,
    };
    upload.importResumeFile.mockResolvedValue({
      success: true,
      document: createDocument(resumeNamed("Alex")),
      feedback,
    });
    setResume("basics", "name", "Jane");
    renderMenu();

    chooseFile(screen.getByLabelText("Import resume file"));
    await flush();

    expect(resume.basics.name).toBe("Alex");
    expect(importFeedback()).toEqual(feedback);
    const copy = [...db.drafts.values()].find((draft) => draft.id.startsWith("copy-"));
    expect(copy?.name).toBe("Jane (before import)");
  });
});

describe("Saved copies", () => {
  it("shows an error instead of an empty list when copies can't be loaded", async () => {
    db.listDrafts.mockResolvedValue(null);
    renderMenu();

    await openCopies();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load your saved copies. Try again."
    );
    expect(screen.queryByText("No saved copies yet.")).toBeNull();
  });

  it("closes on Escape and returns focus to the resume button", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: /^Resume:/ });

    await openCopies();
    expect(screen.getByRole("dialog", { name: "Saved copies" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("asks in a dialog before deleting a copy", async () => {
    seedDraft("draft-1", "Alex");
    renderMenu();
    await openCopies();

    fireEvent.click(screen.getByRole("button", { name: "Delete Alex" }));
    await flush();
    const confirm = screen.getByRole("dialog", { name: "Delete “Alex”?" });
    expect(document.activeElement).toHaveTextContent("Cancel");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();
    expect(confirm).not.toBeInTheDocument();
    expect(db.deleteDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Alex" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Delete copy" }));
    await flush();

    expect(db.deleteDraft).toHaveBeenCalledWith("draft-1");
    expect(screen.getByText("No saved copies yet.")).toBeInTheDocument();
  });

  it("keeps a copy of the current resume before opening one over it", async () => {
    seedDraft("draft-1", "Alex");
    setResume("basics", "name", "Jane");
    renderMenu();
    await openCopies();

    fireEvent.click(screen.getByRole("button", { name: "Open Alex" }));
    await flush();

    expect(resume.basics.name).toBe("Alex");
    const copy = [...db.drafts.values()].find((draft) => draft.id.startsWith("copy-"));
    expect(copy?.name).toBe("Jane (before loading draft)");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
