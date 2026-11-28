// Shared by the Applications screens on both sides: how the list groups, and how times read.

import type { ApplicationStatus } from "@tailory/core";

/**
 * The order of the status groups on the home screen: what needs you soonest first, closed
 * applications last.
 */
export const STATUS_ORDER: readonly ApplicationStatus[] = [
  "interviewing",
  "applied",
  "drafting",
  "closed",
];

export type StatusGroup<T> = { status: ApplicationStatus; items: T[] };

/**
 * Applications grouped by status, in STATUS_ORDER, leaving out empty groups. Each group keeps the
 * order it was given (most recently changed first).
 */
export const groupByStatus = <T extends { status: ApplicationStatus }>(
  applications: readonly T[]
): StatusGroup<T>[] =>
  STATUS_ORDER.map((status) => ({
    status,
    items: applications.filter((application) => application.status === status),
  })).filter((group) => group.items.length > 0);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday": how long ago `iso` was, to the minute. */
export const timeAgo = (iso: string, now = Date.now()) => {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

/** A date and time to show in full, in a tooltip. */
export const fullTime = (iso: string) =>
  new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
