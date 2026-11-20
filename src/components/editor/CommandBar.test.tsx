import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import CommandBar from "@/components/editor/CommandBar";
import { importError, importFeedback, setImportError, setImportFeedback } from "@/store/resume";
import { EMPTY_RESUME } from "@/types/resume";

const mocks = vi.hoisted(() => ({
  importResumeFile: vi.fn(),
  replaceResume: vi.fn(),
}));

vi.mock("@/components/editor/DraftManager", () => ({ default: () => null }));
vi.mock("@/components/editor/replace-resume", () => ({ replaceResume: mocks.replaceResume }));
vi.mock("@/lib/upload/import-resume", () => ({ importResumeFile: mocks.importResumeFile }));

const feedback = { confidence: 90, work: 1, education: 0, skills: 0, projects: 0, certificates: 0 };

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function chooseFile(input: HTMLElement) {
  const file = new File(["{}"], "resume.json", { type: "application/json" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.input(input);
}

afterEach(() => {
  vi.resetAllMocks();
  setImportError("");
  setImportFeedback(null);
});

describe("CommandBar import", () => {
  it("stops the spinner and says what to do when import throws", async () => {
    mocks.importResumeFile.mockRejectedValue(new Error("boom"));
    const { getByLabelText } = render(() => <CommandBar />);

    chooseFile(getByLabelText("Import resume file"));
    await flush();

    expect(importError()).toBe("Couldn't import this file. Try again or choose a different file.");
    expect(getByLabelText("Import resume from file")).toBeEnabled();
    expect(mocks.replaceResume).not.toHaveBeenCalled();
  });

  it("replaces the resume through the copy-keeping path", async () => {
    const imported = structuredClone(EMPTY_RESUME);
    mocks.importResumeFile.mockResolvedValue({ success: true, resume: imported, feedback });
    mocks.replaceResume.mockResolvedValue(true);
    const { getByLabelText } = render(() => <CommandBar />);

    chooseFile(getByLabelText("Import resume file"));
    await flush();

    expect(mocks.replaceResume).toHaveBeenCalledWith(imported, "import");
    expect(importFeedback()).toEqual(feedback);
  });

  it("shows no import feedback when the user cancels the replacement", async () => {
    mocks.importResumeFile.mockResolvedValue({
      success: true,
      resume: structuredClone(EMPTY_RESUME),
      feedback,
    });
    mocks.replaceResume.mockResolvedValue(false);
    const { getByLabelText } = render(() => <CommandBar />);

    chooseFile(getByLabelText("Import resume file"));
    await flush();

    expect(importFeedback()).toBeNull();
    expect(getByLabelText("Import resume from file")).toBeEnabled();
  });
});
