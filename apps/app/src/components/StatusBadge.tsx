import { APPLICATION_STATUSES, type ApplicationStatus } from "@tailory/core";

/** Where an application stands. The same four names the MCP tools and the database use. */
export const STATUSES = APPLICATION_STATUSES;

export type Status = ApplicationStatus;

export const STATUS_LABELS: Record<Status, string> = {
  drafting: "Drafting",
  applied: "Applied",
  interviewing: "Interviewing",
  closed: "Closed",
};

/** The status word in a tinted pill. The word is always shown, so colour is never the only cue. */
export function StatusBadge(props: { status: Status }) {
  return <span class={`status status--${props.status}`}>{STATUS_LABELS[props.status]}</span>;
}
