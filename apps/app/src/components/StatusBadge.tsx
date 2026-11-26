/** Where an application stands. The same six names the MCP tools and the database use. */
export const STATUSES = [
  "drafting",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  drafting: "Drafting",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** The status word in a tinted pill. The word is always shown, so colour is never the only cue. */
export function StatusBadge(props: { status: Status }) {
  return <span class={`status status--${props.status}`}>{STATUS_LABELS[props.status]}</span>;
}
