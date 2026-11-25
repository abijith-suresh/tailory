import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Facts about this installation, one row per key. `install_id` is set on first start.
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
