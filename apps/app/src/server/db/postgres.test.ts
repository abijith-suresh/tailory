import { sql } from "drizzle-orm";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { openDatabase } from ".";
import { COLUMNS_SNAPSHOT, columnsText, publicColumns } from "./testing";

// Runs against a real Postgres when TAILORY_TEST_DATABASE_URL is set (CI's postgres job does);
// skipped otherwise. The test drops and recreates the public schema, so point it at a scratch
// database.
const url = process.env.TAILORY_TEST_DATABASE_URL;

describe.skipIf(!url)("openDatabase with Postgres", () => {
  const reset = async () => {
    const client = postgres(url as string, { max: 1, onnotice: () => {} });
    await client`drop schema if exists drizzle cascade`;
    await client`drop schema public cascade`;
    await client`create schema public`;
    await client.end();
  };

  it("applies the migrations, builds the same columns as PGlite, and reopens cleanly", async () => {
    await reset();
    const first = await openDatabase({ dataDir: "/unused", databaseUrl: url });
    try {
      expect(first.driver).toBe("postgres");
      await expect(columnsText(await publicColumns(first.db))).toMatchFileSnapshot(
        COLUMNS_SNAPSHOT
      );
    } finally {
      await first.close();
    }

    const second = await openDatabase({ dataDir: "/unused", databaseUrl: url });
    try {
      const rows = await second.db.execute(sql`select count(*)::int as n from app_meta`);
      expect(rows).toEqual([{ n: 1 }]);
    } finally {
      await second.close();
    }
  });

  it("gives up on an unreachable server after the timeout", async () => {
    const unreachable = new URL(url as string);
    unreachable.port = "1";
    const started = Date.now();
    await expect(
      openDatabase(
        { dataDir: "/unused", databaseUrl: unreachable.href },
        { connectTimeoutMs: 1_500 }
      )
    ).rejects.toMatchObject({ cause: { code: "ECONNREFUSED" } });
    expect(Date.now() - started).toBeGreaterThanOrEqual(1_000);
  });
});
