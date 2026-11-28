import type { ResumeSchema } from "@tailory/core";
import type { Config } from "./config";

import { type DataContext, getProfile, listApplications } from "./data";

/** Where this Tailory keeps its data: a folder on this computer, or a database server. */
export type DataLocation = { kind: "folder"; path: string } | { kind: "database" };

export const dataLocation = (config: Pick<Config, "dataDir" | "databaseUrl">): DataLocation =>
  config.databaseUrl ? { kind: "database" } : { kind: "folder", path: config.dataDir };

const filled = (value: unknown) => typeof value === "string" && value.trim() !== "";

/** Whether a profile holds anything a person wrote: a basics field, or any entry in a section. */
export const hasContent = (resume: ResumeSchema) => {
  const { location, profiles, ...basics } = resume.basics;
  if (Object.values(basics).some(filled)) return true;
  if (location && Object.values(location).some(filled)) return true;
  if ((profiles?.length ?? 0) > 0) return true;
  return Object.entries(resume).some(
    ([key, value]) =>
      key !== "basics" && key !== "sectionOrder" && Array.isArray(value) && value.length > 0
  );
};

/**
 * A fresh start: no applications, and a profile that was never saved or holds nothing. The home
 * screen then shows the first-run screen instead of the board.
 */
export const isEmptyInstall = async (ctx: Pick<DataContext, "db" | "userId">) => {
  const [profile, applications] = await Promise.all([getProfile(ctx), listApplications(ctx)]);
  if (applications.length > 0) return false;
  return profile.updatedAt === null || !hasContent(profile.resume);
};
