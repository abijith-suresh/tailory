#!/usr/bin/env node
process.env.NODE_ENV ??= "production";

const { main } = await import("../dist/server/main.js");
const code = await main(process.argv.slice(2));
if (code !== undefined) process.exitCode = code;
