import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDocument } from "@/lib/versions/document";
import { isOriginalChanged, resolveVersion } from "@/lib/versions/resolve";
import { sampleDocument, sampleMaster } from "@/test/resume-document";
import { RESUME_SECTION_KEYS } from "@/types/document";
import { EMPTY_RESUME } from "@/types/resume";
import {
  clearRewording,
  createVersion,
  currentDocument,
  deleteEntry,
  deleteHighlight,
  deleteVersion,
  duplicateVersion,
  loadDocument,
  renameVersion,
  setPageTarget,
  setRewording,
  setSectionOrder,
  setVersionJob,
  setVersionTemplate,
  toggleExcluded,
  versions,
} from "./document";
import { resume, setResume, setSelectedTemplate } from "./resume";

let versionId: string;

function version() {
  return versions.find((candidate) => candidate.id === versionId);
}

function onlyRewording() {
  const [rewording] = version()?.rewordings ?? [];
  if (!rewording) throw new Error("The version has no rewording.");
  return rewording;
}

beforeEach(() => {
  loadDocument(sampleDocument([]));
  versionId = createVersion({ name: "Acme", jobTitle: "Designer", company: "Acme" });
});

afterEach(() => {
  loadDocument(createDocument(EMPTY_RESUME));
  setSelectedTemplate("modern");
});

describe("loading a document", () => {
  it("replaces the master and the versions", () => {
    loadDocument(sampleDocument());

    expect(resume.basics.name).toBe("Jane Doe");
    expect(versions.map((candidate) => candidate.id)).toEqual(["version-acme"]);
  });

  it("gives back what was loaded as the current document", () => {
    const document = sampleDocument();
    loadDocument(document);

    expect(createDocument(currentDocument().master)).toEqual(createDocument(document.master));
    expect(currentDocument().versions).toEqual(document.versions);
  });
});

describe("managing versions", () => {
  it("creates a version with the editor's template", () => {
    setSelectedTemplate("minimal");
    const id = createVersion({ name: "Globex" });

    expect(versions.find((candidate) => candidate.id === id)).toMatchObject({
      name: "Globex",
      templateId: "minimal",
      excluded: [],
      pageTarget: null,
    });
  });

  it("renames a version and sets the job it is for", () => {
    renameVersion(versionId, "Acme staff role");
    setVersionJob(versionId, { jobTitle: "Staff designer", company: "" });

    expect(version()).toMatchObject({ name: "Acme staff role", jobTitle: "Staff designer" });
    expect(version()).not.toHaveProperty("company");
  });

  it("duplicates a version right after it, with its own id", () => {
    const later = createVersion({ name: "Later" });
    toggleExcluded(versionId, "work-b");

    const copyId = duplicateVersion(versionId);

    expect(versions.map((candidate) => candidate.name)).toEqual(["Acme", "Acme (copy)", "Later"]);
    expect(copyId).not.toBe(versionId);
    expect(versions[1]?.excluded).toEqual(["work-b"]);

    toggleExcluded(copyId ?? "", "work-a");
    expect(version()?.excluded).toEqual(["work-b"]);
    expect(versions.find((candidate) => candidate.id === later)).toBeDefined();
  });

  it("returns null when duplicating a version that doesn't exist", () => {
    expect(duplicateVersion("missing")).toBeNull();
  });

  it("deletes a version", () => {
    deleteVersion(versionId);

    expect(versions).toEqual([]);
  });

  it("sets the section order, template, and page target", () => {
    setSectionOrder(versionId, ["projects", "work"]);
    setVersionTemplate(versionId, "compact-ats");
    setPageTarget(versionId, 2);

    expect(version()?.sectionOrder.slice(0, 2)).toEqual(["projects", "work"]);
    expect(version()?.sectionOrder).toHaveLength(RESUME_SECTION_KEYS.length);
    expect(version()?.templateId).toBe("compact-ats");
    expect(version()?.pageTarget).toBe(2);

    setPageTarget(versionId, 0);
    expect(version()?.pageTarget).toBeNull();
  });
});

describe("leaving items out", () => {
  it("toggles an entry or a bullet", () => {
    toggleExcluded(versionId, "work-b");
    toggleExcluded(versionId, "bullet-a2");
    expect(version()?.excluded).toEqual(["work-b", "bullet-a2"]);

    toggleExcluded(versionId, "work-b");
    expect(version()?.excluded).toEqual(["bullet-a2"]);
  });

  it("ignores ids the master doesn't have and the fields under the name", () => {
    toggleExcluded(versionId, "missing");
    toggleExcluded(versionId, "basics");

    expect(version()?.excluded).toEqual([]);
  });
});

describe("rewording", () => {
  it("rewords a field, remembering the master text it replaces", () => {
    expect(setRewording(versionId, "bullet-a1", "text", "Rebuilt scheduling")).toBe(true);

    expect(version()?.rewordings).toEqual([
      {
        itemId: "bullet-a1",
        field: "text",
        text: "Rebuilt scheduling",
        baseText: "Redesigned scheduling",
      },
    ]);
  });

  it("updates an existing rewording instead of adding another", () => {
    setRewording(versionId, "basics", "label", "Design lead");
    setRewording(versionId, "basics", "label", "Staff designer");

    expect(version()?.rewordings).toHaveLength(1);
    expect(version()?.rewordings[0]?.text).toBe("Staff designer");
  });

  it("rewords a field the master leaves empty", () => {
    expect(setRewording(versionId, "work-b", "summary", "Ran research.")).toBe(true);
    expect(version()?.rewordings[0]?.baseText).toBe("");
  });

  it("refuses items the master doesn't have and fields that can't be reworded", () => {
    expect(setRewording(versionId, "missing", "text", "x")).toBe(false);
    expect(setRewording(versionId, "work-a", "id", "x")).toBe(false);
    expect(version()?.rewordings).toEqual([]);
  });

  it("drops the rewording when the wording matches the master again", () => {
    setRewording(versionId, "work-a", "position", "Design lead");
    setRewording(versionId, "work-a", "position", "Senior designer");

    expect(version()?.rewordings).toEqual([]);
  });

  it("returns the field to the master text when the rewording is cleared", () => {
    setRewording(versionId, "work-a", "position", "Design lead");
    clearRewording(versionId, "work-a", "position");

    expect(resolveVersion(currentDocument(), versionId).work?.[0]?.position).toBe(
      "Senior designer"
    );
  });

  it("lets master edits reach versions that haven't reworded the field", () => {
    setRewording(versionId, "work-a", "position", "Design lead");
    setResume("work", 0, "name", "Fieldnote Inc.");
    setResume("work", 0, "position", "Principal designer");

    const resolved = resolveVersion(currentDocument(), versionId);
    expect(resolved.work?.[0]).toMatchObject({ name: "Fieldnote Inc.", position: "Design lead" });
    expect(isOriginalChanged(resume, onlyRewording())).toBe(true);
  });

  it("keeps the version's wording against the new master text when set again", () => {
    setRewording(versionId, "work-a", "position", "Design lead");
    setResume("work", 0, "position", "Principal designer");

    setRewording(versionId, "work-a", "position", "Design lead");

    expect(isOriginalChanged(resume, onlyRewording())).toBe(false);
  });
});

describe("deleting from the master", () => {
  beforeEach(() => {
    toggleExcluded(versionId, "work-a");
    toggleExcluded(versionId, "bullet-a2");
    toggleExcluded(versionId, "bullet-b1");
    setRewording(versionId, "work-a", "position", "Design lead");
    setRewording(versionId, "bullet-a1", "text", "Rebuilt scheduling");
    setRewording(versionId, "bullet-b1", "text", "Interviewed users");
    duplicateVersion(versionId);
  });

  it("removes an entry and every version's references to it and its bullets", () => {
    deleteEntry("work", "work-a");

    expect(resume.work?.map((entry) => entry.id)).toEqual(["work-b"]);
    for (const candidate of versions) {
      expect(candidate.excluded).toEqual(["bullet-b1"]);
      expect(candidate.rewordings.map((rewording) => rewording.itemId)).toEqual(["bullet-b1"]);
    }
  });

  it("removes a bullet and every version's references to it", () => {
    deleteHighlight("work", "work-b", "bullet-b1");

    expect(resume.work?.[1]?.highlights).toEqual([]);
    for (const candidate of versions) {
      expect(candidate.excluded).toEqual(["work-a", "bullet-a2"]);
      expect(candidate.rewordings.map((rewording) => rewording.itemId)).toEqual([
        "work-a",
        "bullet-a1",
      ]);
    }
  });

  it("leaves the master alone when the item isn't there", () => {
    deleteEntry("work", "missing");
    deleteHighlight("projects", "project-a", "missing");

    expect(createDocument(resume).master).toEqual(createDocument(sampleMaster()).master);
  });
});
