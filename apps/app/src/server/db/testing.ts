import { sql } from "drizzle-orm";

import type { Db } from ".";

/** Every column in the public schema, for comparing what migrations built on each driver. */
type ColumnRow = { table: string; column: string; type: string; nullable: string };

export const publicColumns = async (db: Db) => {
  const result: unknown = await db.execute(
    sql`select table_name as "table", column_name as "column", data_type as "type", is_nullable as "nullable"
        from information_schema.columns where table_schema = 'public'
        order by table_name, ordinal_position`
  );
  // postgres-js returns the rows directly; PGlite wraps them in { rows }.
  const list = (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as ColumnRow[];
  return list.map((row) => `${row.table}.${row.column} ${row.type} ${row.nullable}`);
};

export const expectedColumns = [
  "app_meta.key text NO",
  "app_meta.value text NO",
  "app_meta.updated_at timestamp with time zone NO",
];
