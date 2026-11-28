"use server";

// Server functions for Settings › Data and the first-run screen.

import { listApplications } from "./data";
import { getConfig, getDatabase } from "./runtime";
import { requireViewer } from "./session";
import { type DataLocation, dataLocation, isEmptyInstall } from "./settings";

export type DataInfo = { mode: "local" | "server"; location: DataLocation; applications: number };

/** What Settings › Data shows: where the data lives and how many applications erasing removes. */
export async function getDataInfo(): Promise<DataInfo> {
  const viewer = await requireViewer();
  const config = getConfig();
  const { db } = await getDatabase();
  const applications = (await listApplications({ db, userId: viewer.id })).length;
  return { mode: config.mode, location: dataLocation(config), applications };
}

/** True on a fresh install: an empty profile and no applications. */
export async function isFirstRun(): Promise<boolean> {
  const viewer = await requireViewer();
  const { db } = await getDatabase();
  return isEmptyInstall({ db, userId: viewer.id });
}
