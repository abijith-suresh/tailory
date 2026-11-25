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

/**
 * The columns the migrations should build, one per line, shared by the PGlite and Postgres tests
 * so the two drivers can't drift apart. After a schema change, regenerate it with
 * `npx vitest run -u src/server/db/pglite.test.ts`.
 */
export const COLUMNS_SNAPSHOT = "./__snapshots__/columns.txt";

export const columnsText = (columns: string[]) => `${columns.join("\n")}\n`;
