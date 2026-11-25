#!/usr/bin/env node
// `npx tailory`: local mode. Loopback only, no sign-in, data in ~/.tailory.
import { homedir } from "node:os";
import path from "node:path";

const t0 = performance.now();
process.env.TAILORY_MODE ??= "local";
process.env.HOST ??= "127.0.0.1";
process.env.PORT ??= "4413";
process.env.TAILORY_DATA_DIR ??= path.join(homedir(), ".tailory", "data");
process.env.SITE_URL ??= `http://localhost:${process.env.PORT}`;
process.env.NODE_ENV ??= "production";

const { serve } = await import("../dist/server/node.js");
const server = serve({ port: Number(process.env.PORT), host: process.env.HOST });
server.on("listening", () => {
  console.log(`Tailory ready in ${Math.round(performance.now() - t0)}ms → ${process.env.SITE_URL}`);
  console.log(`Data: ${process.env.TAILORY_DATA_DIR}`);
  console.log(`MCP:  ${process.env.SITE_URL}/mcp`);
});
