import { createId } from "@/lib/resume/ids";
import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeDocument, ResumeVersion, Rewording } from "@/types/document";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, type TemplateId } from "@/types/template";
import { indexMasterItems, isExcludable, type MasterItem, readMasterText } from "./items";
import { normalizeSectionOrder } from "./section-order";

export const UNTITLED_VERSION_NAME = "Untitled version";

export interface VersionDetails {
  name: string;
  jobTitle?: string;
  company?: string;
  templateId?: TemplateId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** A page target is a whole number of pages, at least one; anything else means no target. */
export function normalizePageTarget(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

function normalizeTemplateId(value: unknown): TemplateId {
  return TEMPLATE_IDS.find((id) => id === value) ?? DEFAULT_TEMPLATE_ID;
}

/** A new version that keeps everything in the master. */
export function createVersion(details: VersionDetails): ResumeVersion {
  return {
    id: createId(),
    name: details.name.trim() || UNTITLED_VERSION_NAME,
    ...(optionalText(details.jobTitle) && { jobTitle: optionalText(details.jobTitle) }),
    ...(optionalText(details.company) && { company: optionalText(details.company) }),
    excluded: [],
    sectionOrder: normalizeSectionOrder(undefined),
    templateId: details.templateId ?? DEFAULT_TEMPLATE_ID,
    pageTarget: null,
    rewordings: [],
  };
}

function normalizeRewordings(value: unknown, items: Map<string, MasterItem>): Rewording[] {
  if (!Array.isArray(value)) return [];

  const byKey = new Map<string, Rewording>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const { itemId, field, text, baseText } = entry;
    if (typeof itemId !== "string" || typeof field !== "string" || typeof text !== "string") {
      continue;
    }
    const masterText = readMasterText(items, itemId, field);
    if (masterText === null) continue;

    byKey.set(`${itemId}\u0000${field}`, {
      itemId,
      field,
      text,
      baseText: typeof baseText === "string" ? baseText : masterText,
    });
  }
  return [...byKey.values()];
}

function normalizeVersion(value: unknown, items: Map<string, MasterItem>): ResumeVersion | null {
  if (!isRecord(value)) return null;

  const excluded = Array.isArray(value.excluded)
    ? value.excluded.filter(
        (id): id is string => typeof id === "string" && isExcludable(items.get(id))
      )
    : [];
  const jobTitle = optionalText(value.jobTitle);
  const company = optionalText(value.company);

  return {
    id: optionalText(value.id) ?? createId(),
    name: optionalText(value.name) ?? UNTITLED_VERSION_NAME,
    ...(jobTitle && { jobTitle }),
    ...(company && { company }),
    excluded: [...new Set(excluded)],
    sectionOrder: normalizeSectionOrder(value.sectionOrder),
    templateId: normalizeTemplateId(value.templateId),
    pageTarget: normalizePageTarget(value.pageTarget),
    rewordings: normalizeRewordings(value.rewordings, items),
  };
}

/**
 * Cleans a document read from storage or a backup: normalizes the master, and drops versions'
 * references to entries and bullets the master no longer has.
 */
export function normalizeDocument(value: unknown): ResumeDocument {
  const source = isRecord(value) ? value : {};
  const master = normalizeResume(
    (isRecord(source.master) ? source.master : structuredClone(EMPTY_RESUME)) as ResumeSchema
  );
  const items = indexMasterItems(master);
  const versions: ResumeVersion[] = [];

  for (const raw of Array.isArray(source.versions) ? source.versions : []) {
    const version = normalizeVersion(raw, items);
    if (version && !versions.some((existing) => existing.id === version.id)) {
      versions.push(version);
    }
  }

  return { master, versions };
}

/** A document for a resume with no versions yet. */
export function createDocument(master: ResumeSchema): ResumeDocument {
  return normalizeDocument({ master, versions: [] });
}

export function serializeDocument(document: ResumeDocument): string {
  return JSON.stringify(normalizeDocument(document));
}
