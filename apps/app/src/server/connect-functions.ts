"use server";

// Server functions for the Connect an agent page.

import { getRequestEvent } from "@solidjs/web";

import { type ConnectInfo, mcpUrlFor } from "./connect";
import { getConfig } from "./runtime";
import { requireViewer } from "./session";

/** How agents reach this Tailory. */
export async function getConnectInfo(): Promise<ConnectInfo> {
  await requireViewer();
  const config = getConfig();
  const request = getRequestEvent()?.request;
  return { mode: config.mode, mcpUrl: mcpUrlFor(config, request?.url ?? "http://127.0.0.1/") };
}
