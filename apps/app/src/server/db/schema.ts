import type { Application, ApplicationStatus, ResumeSchema } from "@tailory/core";
import { bigint, boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

// Facts about this installation, one row per key. `install_id` is set on first start.
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Every table below belongs to one user and goes with them: `on delete cascade` on `user_id`.

/** A user's profile: their whole career history, in the resume shape core normalizes. */
export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  resume: jsonb("resume").$type<ResumeSchema>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

/** The parts of an application kept in `application.data`; the rest are columns. */
export type ApplicationData = Omit<
  Application,
  "id" | "company" | "role" | "status" | "archived" | "createdAt"
>;

/**
 * One job applied for. The fields the list filters and sorts on are columns; everything else,
 * including how the resume is tailored, is one jsonb value that changes with the core model.
 */
export const application = pgTable(
  "application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    role: text("role").notNull(),
    status: text("status").$type<ApplicationStatus>().notNull(),
    archived: boolean("archived").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    data: jsonb("data").$type<ApplicationData>().notNull(),
  },
  (table) => [index("application_user_id_idx").on(table.userId, table.updatedAt)]
);

/** What a change was made to. */
export type ChangeTargetKind = "profile" | "application";

/** Who made a change: the user in the web app, or an agent through MCP. */
export type ActorKind = "user" | "agent";

/**
 * The change log: one row per write, with the value before and after it, so a change can be shown
 * and undone. `before` is null when the write created the target and `after` when it deleted it.
 */
export const change = pgTable(
  "change",
  {
    id: text("id").primaryKey(),
    // Orders changes exactly; several can share a millisecond.
    seq: bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetKind: text("target_kind").$type<ChangeTargetKind>().notNull(),
    // The application's id, or "profile" for the profile.
    targetId: text("target_id").notNull(),
    actorKind: text("actor_kind").$type<ActorKind>().notNull(),
    // The agent's client name when it gave one.
    actorClient: text("actor_client"),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    // The change this one undid, if it is an undo.
    undoes: text("undoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("change_target_idx").on(table.userId, table.targetKind, table.targetId, table.seq),
  ]
);
