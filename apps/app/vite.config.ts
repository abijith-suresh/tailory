import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import solid from "@solidjs/vite-plugin";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// Adds the CLI entry (`dist/server/main.js`) and the renderer (`dist/server/render.js`, which the
// smoke test calls from the packed build) to the server build, next to the plugin's `server.js`
// and `node.js`. One build keeps one copy of the config, database and pdfmake modules.
// The plugin names every server entry `server.js`, so this runs after it and splits the names.
const cliEntry = (): Plugin => ({
  name: "tailory:cli-entry",
  enforce: "post",
  configEnvironment(name, config) {
    if (name !== "ssr" || !config.build?.rollupOptions) return;
    const options = config.build.rollupOptions;
    const own: Record<string, string> = {
      main: "./src/main.ts",
      render: "./src/server/render.ts",
    };
    options.input = { ...(options.input as Record<string, string>), ...own };
    options.output = {
      ...options.output,
      entryFileNames: (chunk) => (chunk.name in own ? `${chunk.name}.js` : "server.js"),
    };
  },
});

export default defineConfig(({ command }) => {
  // `npm run dev` keeps its database in apps/app/.data, away from a real ~/.tailory.
  if (command === "serve")
    process.env.TAILORY_DATA_DIR ??= fileURLToPath(new URL("./.data", import.meta.url));
  return {
    define: { __TAILORY_VERSION__: JSON.stringify(pkg.version) },
    plugins: [
      solid({
        ssr: true,
        serverFunctions: true,
        start: {
          nodeServer: true,
          middleware: "./src/middleware.ts",
        },
      }),
      cliEntry(),
    ],
    // Bundle every server dependency except PGlite, which loads its WASM and data files from its
    // own package directory at runtime. The published package then depends on PGlite alone.
    // pdfmake is bundled too (src/server/render.ts loads its minified browser build, which carries
    // pdfkit and the Roboto files); the Node build would install 16 more packages, 24 MB.
    ssr: { noExternal: true, external: ["@electric-sql/pglite"] },
    server: { host: "127.0.0.1", port: 4413, strictPort: true },
  };
});
