import { normalizeResume, type ResumeSchema } from "@tailory/core";

import {
  type ChangeRecord,
  type DataContext,
  DataError,
  emptyProfile,
  getProfile,
  listChanges,
  readProfile,
  replaceProfile,
  sameJson,
  undoChange,
  writeProfile,
} from "./data";

// What the Profile page reads and writes, on top of the data layer. The "use server" functions in
// profile-functions.ts check who is calling and hand these a context that acts as that user.

/** The resume sections the profile editor shows, in the order it shows them. */
export const PROFILE_SECTIONS = [
  "work",
  "education",
  "projects",
  "skills",
  "volunteer",
  "certificates",
  "awards",
  "publications",
  "languages",
  "interests",
  "references",
] as const satisfies readonly (keyof ResumeSchema)[];

export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

const SECTION_NAMES: Record<ProfileSection | "basics", string> = {
  basics: "the basics",
  work: "work",
  education: "education",
  projects: "projects",
  skills: "skills",
  volunteer: "volunteering",
  certificates: "certificates",
  awards: "awards",
  publications: "publications",
  languages: "languages",
  interests: "interests",
  references: "references",
};

/** The largest profile a save or import accepts, as JSON. A long career fits in a few dozen KB. */
export const MAX_PROFILE_BYTES = 1_000_000;

/** A change in the profile's history, without the stored values. */
export type ChangeView = {
  id: string;
  summary: string;
  /** "You", the agent's client name, or "Your agent". */
  by: string;
  byAgent: boolean;
  createdAt: string;
  /** Only the newest change can be undone; undoing an older one would throw away later edits. */
  undoable: boolean;
};

export type ProfileState = {
  resume: ResumeSchema;
  updatedAt: string | null;
  changes: ChangeView[];
};

export type SaveResult =
  | ({ ok: true } & ProfileState)
  | { ok: false; reason: "conflict" | "invalid"; message: string };

const RECENT_CHANGES = 20;

export const toChangeView = (change: ChangeRecord, newest: boolean): ChangeView => ({
  id: change.id,
  summary: change.summary,
  by: change.actor.kind === "user" ? "You" : (change.actor.client ?? "Your agent"),
  byAgent: change.actor.kind === "agent",
  createdAt: change.createdAt,
  undoable: newest,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A resume from the browser, cut down to the fields the model has. Throws DataError("invalid")
 * when it isn't a resume or is too large. The data layer normalizes what is left.
 */
export const toResumeInput = (value: unknown): ResumeSchema => {
  if (!isRecord(value) || !isRecord(value.basics)) {
    throw new DataError("invalid", "That isn't a resume");
  }
  if (JSON.stringify(value).length > MAX_PROFILE_BYTES) {
    throw new DataError("invalid", "The profile is too large to save");
  }
  const resume: Record<string, unknown> = { basics: value.basics };
  for (const key of PROFILE_SECTIONS) {
    if (Array.isArray(value[key])) resume[key] = value[key];
  }
  return resume as unknown as ResumeSchema;
};

const listWords = (words: string[]) =>
  words.length <= 2 ? words.join(" and ") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

/** A one-line summary of what an edit changed, such as "Edited work and skills". */
export const describeProfileEdit = (before: ResumeSchema, after: ResumeSchema) => {
  const changed = (["basics", ...PROFILE_SECTIONS] as const).filter(
    (key) => !sameJson(before[key], after[key])
  );
  if (changed.length === 0) return "Edited the profile";
  if (changed.length > 3) return `Edited ${changed.length} sections`;
  return `Edited ${listWords(changed.map((key) => SECTION_NAMES[key]))}`;
};

/** The profile and its recent changes. */
export const loadProfile = async (ctx: DataContext): Promise<ProfileState> => {
  const [profile, changes] = await Promise.all([
    getProfile(ctx),
    listChanges(ctx, { kind: "profile" }, { limit: RECENT_CHANGES }),
  ]);
  return {
    resume: profile.resume,
    updatedAt: profile.updatedAt,
    changes: changes.map((change, index) => toChangeView(change, index === 0)),
  };
};

const failure = (error: unknown): SaveResult => {
  if (error instanceof DataError && (error.code === "conflict" || error.code === "invalid")) {
    return { ok: false, reason: error.code, message: error.message };
  }
  throw error;
};

/**
 * Saves an edit from the profile page. `base` is the profile the page last loaded or saved; when
 * the stored profile is no longer that (an agent changed it meanwhile), nothing is written and
 * the result says so, so the page never overwrites someone else's change unseen.
 */
export const saveProfile = async (
  ctx: DataContext,
  base: unknown,
  next: unknown
): Promise<SaveResult> => {
  try {
    const resume = normalizeResume(toResumeInput(next));
    await ctx.db.transaction(async (tx) => {
      const row = await readProfile(tx, ctx.userId, true);
      const current = row?.resume ?? emptyProfile();
      if (!sameJson(current, base)) {
        throw new DataError("conflict", "The profile changed somewhere else since you opened it");
      }
      if (sameJson(current, resume)) return;
      await writeProfile(tx, ctx, row?.resume ?? null, resume, describeProfileEdit(current, resume));
    });
    return { ok: true, ...(await loadProfile(ctx)) };
  } catch (error) {
    return failure(error);
  }
};

const fileLabel = (fileName: string) => {
  const name = fileName.replace(/[\r\n\t]+/g, " ").trim();
  return name.length > 80 ? `${name.slice(0, 77)}...` : name || "a file";
};

/** Replaces the whole profile with an imported resume, as one change that can be undone. */
export const importProfile = async (
  ctx: DataContext,
  resume: unknown,
  fileName: string
): Promise<SaveResult> => {
  try {
    await replaceProfile(ctx, toResumeInput(resume), `Imported ${fileLabel(fileName)}`);
    return { ok: true, ...(await loadProfile(ctx)) };
  } catch (error) {
    return failure(error);
  }
};

/** Undoes profile change `changeId`. Refuses changes to anything but the profile. */
export const undoProfileChange = async (
  ctx: DataContext,
  changeId: string
): Promise<SaveResult> => {
  try {
    const [newest] = await listChanges(ctx, { kind: "profile" }, { limit: 1 });
    if (newest?.id !== changeId) {
      throw new DataError("conflict", "Only the latest change can be undone");
    }
    await undoChange(ctx, changeId);
    return { ok: true, ...(await loadProfile(ctx)) };
  } catch (error) {
    return failure(error);
  }
};
