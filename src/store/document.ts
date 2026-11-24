import { createStore, produce, reconcile, unwrap } from "solid-js/store";

import { createId } from "@/lib/resume/ids";
import {
  createVersion as buildVersion,
  normalizeDocument,
  normalizePageTarget,
  type VersionDetails,
} from "@/lib/versions/document";
import {
  type EntrySection,
  indexMasterItems,
  isExcludable,
  readMasterText,
} from "@/lib/versions/items";
import { sameText } from "@/lib/versions/resolve";
import { normalizeSectionOrder } from "@/lib/versions/section-order";
import type { ResumeDocument, ResumeSectionKey, ResumeVersion } from "@/types/document";
import type { TemplateId } from "@/types/template";
import { resume, selectedTemplate, setResume } from "./resume";

/** The versions of the resume in the editor. The master is the `resume` store. */
export const [versions, setVersions] = createStore<ResumeVersion[]>([]);

/** The resume in the editor as one document. Reads are reactive inside a tracking scope. */
export function currentDocument(): ResumeDocument {
  return { master: resume, versions };
}

/** Replaces the master and every version, for example after an import or loading a draft. */
export function loadDocument(document: ResumeDocument) {
  const normalized = normalizeDocument(document);
  setResume(normalized.master);
  setVersions(reconcile(normalized.versions, { key: "id" }));
}

function updateVersion(versionId: string, update: (version: ResumeVersion) => void) {
  setVersions((version) => version.id === versionId, produce(update));
}

/** Adds a version that keeps everything, using the editor's template unless one is given. */
export function createVersion(details: VersionDetails): string {
  const version = buildVersion({ templateId: selectedTemplate(), ...details });
  setVersions(versions.length, version);
  return version.id;
}

export function renameVersion(versionId: string, name: string) {
  updateVersion(versionId, (version) => {
    version.name = name;
  });
}

/** Sets the job a version is for. An empty value clears that part. */
export function setVersionJob(
  versionId: string,
  job: Partial<Pick<ResumeVersion, "jobTitle" | "company">>
) {
  updateVersion(versionId, (version) => {
    for (const key of ["jobTitle", "company"] as const) {
      if (!(key in job)) continue;
      const value = job[key]?.trim();
      if (value) version[key] = job[key];
      else delete version[key];
    }
  });
}

export function deleteVersion(versionId: string) {
  setVersions((list) => list.filter((version) => version.id !== versionId));
}

/** Copies a version, placed right after it. Returns the copy's id, or null if there is none. */
export function duplicateVersion(versionId: string): string | null {
  const index = versions.findIndex((version) => version.id === versionId);
  const original = versions[index];
  if (!original) return null;

  const copy: ResumeVersion = {
    ...structuredClone(unwrap(original)),
    id: createId(),
    name: `${original.name} (copy)`,
  };
  setVersions((list) => [...list.slice(0, index + 1), copy, ...list.slice(index + 1)]);
  return copy.id;
}

/** Leaves an entry or bullet out of a version, or brings it back. */
export function toggleExcluded(versionId: string, itemId: string) {
  if (!isExcludable(indexMasterItems(resume).get(itemId))) return;

  updateVersion(versionId, (version) => {
    version.excluded = version.excluded.includes(itemId)
      ? version.excluded.filter((id) => id !== itemId)
      : [...version.excluded, itemId];
  });
}

/**
 * Gives a field the version's own wording, remembering the master text it replaces. Wording the
 * same as the master's clears the rewording, so later master edits reach the version again.
 * Returns false when the master has no such item or field.
 */
export function setRewording(versionId: string, itemId: string, field: string, text: string) {
  const baseText = readMasterText(indexMasterItems(resume), itemId, field);
  if (baseText === null) return false;

  if (sameText(text, baseText)) {
    clearRewording(versionId, itemId, field);
    return true;
  }

  updateVersion(versionId, (version) => {
    const existing = version.rewordings.find(
      (rewording) => rewording.itemId === itemId && rewording.field === field
    );
    if (existing) {
      existing.text = text;
      existing.baseText = baseText;
    } else {
      version.rewordings.push({ itemId, field, text, baseText });
    }
  });
  return true;
}

/** Drops a rewording, so the field shows the master text again. */
export function clearRewording(versionId: string, itemId: string, field: string) {
  updateVersion(versionId, (version) => {
    version.rewordings = version.rewordings.filter(
      (rewording) => rewording.itemId !== itemId || rewording.field !== field
    );
  });
}

export function setSectionOrder(versionId: string, order: readonly ResumeSectionKey[]) {
  updateVersion(versionId, (version) => {
    version.sectionOrder = normalizeSectionOrder(order);
  });
}

export function setVersionTemplate(versionId: string, templateId: TemplateId) {
  updateVersion(versionId, (version) => {
    version.templateId = templateId;
  });
}

/** Sets how many pages a version should fit on. Anything but a whole number of 1 or more clears it. */
export function setPageTarget(versionId: string, pageTarget: number | null) {
  updateVersion(versionId, (version) => {
    version.pageTarget = normalizePageTarget(pageTarget);
  });
}

/** Drops versions' references to entries and bullets the master no longer has. */
function pruneVersions() {
  const items = indexMasterItems(resume);
  setVersions(
    produce((list) => {
      for (const version of list) {
        version.excluded = version.excluded.filter((id) => isExcludable(items.get(id)));
        version.rewordings = version.rewordings.filter(
          (rewording) => readMasterText(items, rewording.itemId, rewording.field) !== null
        );
      }
    })
  );
}

/** Deletes an entry from the master and every version's reference to it or its bullets. */
export function deleteEntry(section: EntrySection, entryId: string) {
  setResume(
    produce((master) => {
      const entries = master[section] as Array<{ id: string }> | undefined;
      const index = entries?.findIndex((entry) => entry.id === entryId) ?? -1;
      if (index >= 0) entries?.splice(index, 1);
    })
  );
  pruneVersions();
}

/** Deletes a bullet from the master and every version's reference to it. */
export function deleteHighlight(
  section: "work" | "volunteer" | "projects",
  entryId: string,
  highlightId: string
) {
  setResume(
    produce((master) => {
      const highlights = master[section]?.find((entry) => entry.id === entryId)?.highlights;
      const index = highlights?.findIndex((highlight) => highlight.id === highlightId) ?? -1;
      if (index >= 0) highlights?.splice(index, 1);
    })
  );
  pruneVersions();
}
