import { eq } from "drizzle-orm";

import { schema } from "../db";
import type { DataContext } from "./context";

/** The last tool call a user's agent made over MCP. */
export type AgentActivity = {
  /** The agent's client name, when it gave one. */
  client: string | null;
  tool: string;
  calledAt: string;
};

/** Records a tool call as the user's latest, replacing the one before. */
export const recordToolCall = async (
  ctx: Pick<DataContext, "db" | "userId">,
  call: { client: string | null; tool: string },
  now = new Date()
): Promise<void> => {
  const values = { client: call.client, tool: call.tool, calledAt: now };
  await ctx.db
    .insert(schema.mcpActivity)
    .values({ userId: ctx.userId, ...values })
    .onConflictDoUpdate({ target: schema.mcpActivity.userId, set: values });
};

/** The user's agent's last tool call, or null when no agent has called one yet. */
export const getLastToolCall = async (
  ctx: Pick<DataContext, "db" | "userId">
): Promise<AgentActivity | null> => {
  const [row] = await ctx.db
    .select()
    .from(schema.mcpActivity)
    .where(eq(schema.mcpActivity.userId, ctx.userId));
  return row ? { client: row.client, tool: row.tool, calledAt: row.calledAt.toISOString() } : null;
};
