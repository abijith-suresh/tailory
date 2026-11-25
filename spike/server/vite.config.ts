import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

const ssr = process.env.SPIKE_SSR !== "false";
// SPIKE_BUNDLE=true: inline every server dep except the two that load files
// from their own package dir at runtime (PGlite WASM, pdfmake fonts).
const bundle = process.env.SPIKE_BUNDLE === "true";

import path from "node:path";

export default defineConfig({
  // Reuse Tailory's existing src/lib (PDF templates) unchanged.
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../../src") } },
  plugins: [
    solid({
      ssr,
      serverFunctions: true,
      start: {
        nodeServer: true,
        middleware: "./src/middleware.ts",
        serverSetup: "./src/server/setup.ts",
      },
    }),
  ],
  ssr: bundle ? { noExternal: true, external: ["@electric-sql/pglite", "pdfmake"] } : undefined,
  server: { port: 4413, strictPort: true },
});
