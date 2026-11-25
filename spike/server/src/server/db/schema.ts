import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

// The one app table the spike needs: a resume per user.
export const resume = pgTable("resume", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
