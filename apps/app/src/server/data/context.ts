import { randomUUID } from "node:crypto";

import type { Db } from "../db";
import { schema } from "../db";
import type { ActorKind, ChangeTargetKind } from "../db/schema";

/** Who makes a write: the user in the web app, or an agent, by its client name when known. */
export type Actor = { kind: "user" } | { kind: "agent"; client: string | null };

/**
 * Who a data call acts for and as. Every query is limited to `userId`'s rows; `actor` is recorded
 * on each change a write makes.
 */
export type DataContext = { db: Db; userId: string; actor: Actor };

/** A transaction, or the database itself; both run the same queries. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type DataErrorCode = "not_found" | "conflict" | "invalid";

/**
 * A data call that can't go ahead: the row isn't this user's (or doesn't exist), has moved on, or
 * the input isn't usable.
 */
export class DataError extends Error {
  readonly code: DataErrorCode;
  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = "DataError";
    this.code = code;
  }
}

export const notFound = (what: string) => new DataError("not_found", `${what} not found`);

/** The target id the change log uses for the profile; a user has one. */
export const PROFILE_TARGET_ID = "profile";

export type ChangeInput = {
  targetKind: ChangeTargetKind;
  targetId: string;
  summary: string;
  before: unknown;
  after: unknown;
  undoes?: string | null;
};

/** Writes one change row inside the caller's transaction. */
export const recordChange = async (tx: Tx, ctx: DataContext, input: ChangeInput, now: Date) => {
  const actorKind: ActorKind = ctx.actor.kind;
  const [row] = await tx
    .insert(schema.change)
    .values({
      id: randomUUID(),
      userId: ctx.userId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      actorKind,
      actorClient: ctx.actor.kind === "agent" ? ctx.actor.client : null,
      summary: input.summary,
      before: input.before ?? null,
      after: input.after ?? null,
      undoes: input.undoes ?? null,
      createdAt: now,
    })
    .returning();
  return row;
};

/** JSON with object keys sorted, so two values compare equal whatever order jsonb kept. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

/** Whether two JSON values hold the same data. `undefined` and `null` count as the same. */
export const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a ?? null)) === JSON.stringify(canonical(b ?? null));
