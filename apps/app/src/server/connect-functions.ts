"use server";

// Server functions for Settings › Agents.

import { getRequestEvent } from "@solidjs/web";

import { type ConnectInfo, mcpUrlFor } from "./connect";
import { type AgentActivity, getLastToolCall } from "./data";
import { getConfig, getDatabase } from "./runtime";
import { requireViewer } from "./session";

/** How agents reach this Tailory. */
export async function getConnectInfo(): Promise<ConnectInfo> {
  await requireViewer();
  const config = getConfig();
  const request = getRequestEvent()?.request;
  return { mode: config.mode, mcpUrl: mcpUrlFor(config, request?.url ?? "http://127.0.0.1/") };
}

/**
 * The last MCP tool call the caller's agent made (client name, tool, time), or null when none has
 * yet. Settings › Agents polls it to check a connection.
 */
export async function getAgentConnection(): Promise<{ lastCall: AgentActivity | null }> {
  const viewer = await requireViewer();
  const { db } = await getDatabase();
  return { lastCall: await getLastToolCall({ db, userId: viewer.id }) };
}
