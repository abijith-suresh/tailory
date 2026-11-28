"use server";

// Server functions for the Profile page. Each acts as the signed-in user (or the local user), and
// every write is logged with the user as its author.

import type { DataContext } from "./data";
import {
  importProfile,
  loadProfile,
  type ProfileState,
  type SaveResult,
  saveProfile,
  undoProfileChange,
} from "./profile-page";
import { getDatabase } from "./runtime";
import { requireViewer } from "./session";

const asUser = async (): Promise<DataContext> => {
  const viewer = await requireViewer();
  const { db } = await getDatabase();
  return { db, userId: viewer.id, actor: { kind: "user" } };
};

/** The profile and its recent changes. */
export async function getProfileState(): Promise<ProfileState> {
  return loadProfile(await asUser());
}

/** Saves an edit made from `base`, the profile the page last had. */
export async function saveProfileEdit(base: unknown, next: unknown): Promise<SaveResult> {
  return saveProfile(await asUser(), base, next);
}

/** Replaces the profile with a resume read from a file. */
export async function importProfileFile(resume: unknown, fileName: string): Promise<SaveResult> {
  return importProfile(await asUser(), resume, typeof fileName === "string" ? fileName : "");
}

/** Undoes the newest change to the profile. */
export async function undoProfileEdit(changeId: string): Promise<SaveResult> {
  return undoProfileChange(await asUser(), String(changeId));
}
