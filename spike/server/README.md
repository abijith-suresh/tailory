# Server stack spike (throwaway)

Feasibility spike for turning Tailory into one server app that runs three
ways: `npx tailory` (local), Docker (self-host), Railway (hosted). Throwaway
code that won't be merged. It answers whether the chosen stack holds together.

Verdict: the stack works as planned. Start mode can host Better Auth and MCP
directly in its middleware, so no Hono or extra HTTP layer is needed. Two
changes to the plan are worth making: publish a **bundled** server build, and
keep **SSR on**.

## Versions tested (2026-11-25)

| Package                                                          | Version                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| node / npm                                                       | 24.19.0 / 12.2.0 (image: node:24-slim → 24.22.3)         |
| solid-js, @solidjs/web                                           | 2.0.4                                                    |
| @solidjs/router                                                  | 2.0.1                                                    |
| @solidjs/meta                                                    | 2.0.0                                                    |
| @solidjs/vite-plugin                                             | 3.0.1 (vite 8.3.8)                                       |
| better-auth, @better-auth/{mcp,cimd,drizzle-adapter}, `auth` CLI | 1.7.28                                                   |
| @modelcontextprotocol/server, /client                            | 2.4.0 (+ legacy @modelcontextprotocol/sdk 1.32.2 client) |
| drizzle-orm / drizzle-kit                                        | 0.45.4 / 0.31.11                                         |
| @electric-sql/pglite                                             | 0.6.0 (reports **PostgreSQL 19.0**)                      |
| postgres (postgres-js)                                           | 4.1.1, server postgres:17-alpine (17.11) via podman      |
| pdfmake                                                          | 0.3.15                                                   |
| zod                                                              | 4.6.7                                                    |
| podman / podman-compose                                          | 4.9.3 / 1.0.6 (no Docker on this machine)                |

## Results

### 1. Solid 2 start mode: works, with caveats

- `solid({ ssr, serverFunctions: true, start: { nodeServer: true, middleware, serverSetup } })`.
  Build takes about 1.5 s and `node dist/server/node.js` serves it.
- The router (`createRouter` + `defineRoutes`, config routes, no file routes),
  meta (`<Title>` streamed into `<head>`), `<Loading>`, async `createMemo`, and
  a `"use server"` function all work. The server function runs in-process during
  SSR and also over HTTP at `POST /_server/data/<id>` (200 with JSON).
- **SSR on is the better choice.** With SSR on, middleware sees every page request and
  can 302 to `/sign-in` before rendering. With SSR off, the generated Node
  server answers any `Accept: text/html` GET with `dist/client/index.html`
  _before_ middleware runs (`node-runtime.js`, `spa &&` branch), so
  server-side page gating is impossible and the user sees a flash of the app.
- Gotchas:
  - Docs say middleware is `(request, next)`. v3.0.1 calls it as
    `(event, next)` and throws if `next()` gets an argument. Use
    `event.request` and `event.locals`.
  - The generated `node.js` only auto-listens when it is `argv[1]`. A bin
    must call the exported `serve()`.
  - Static files are served before middleware, so middleware checks
    (such as the loopback Host guard) don't cover `/assets/*`.
  - A render error (my `For` misuse) produced a streamed "Internal Server
    Error" with **nothing logged** under `productionErrorBoundary`. Run `tsc`;
    it caught the bug.
  - Default `<For>` passes the item value, not an accessor (`keyed: false`
    passes accessors).
  - A server function that throws "not signed in" returns 500, not 401.
- `vite dev` works with the same middleware, MCP, and PDF code.

### 2. Better Auth: works

- `auth.handler(request)` is mounted in middleware for `/api/auth/*` **and**
  `/.well-known/*`. The mcp plugin's `onRequest` serves root
  `/.well-known/oauth-protected-resource/mcp` and the AS metadata.
- Drizzle adapter on both drivers. Schema comes from
  `npx auth@1.7.28 generate --config auth-cli.config.ts`. That prints a stack
  trace because oauth-provider seeds resources at init and needs a DB, but the
  output is correct: 12 tables.
- GitHub and Google with dummy keys: `POST /api/auth/sign-in/social` returns
  the provider URL with `redirect_uri=…/api/auth/callback/{github,google}`,
  and `/api/auth/callback/github` is routed (302 `state_mismatch` with a bogus
  state).
- `TAILORY_EMAIL_PASSWORD=true` lets sign-up return 200 with a session cookie.
  When unset, it returns 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- Local mode: no auth routes (404). Every request acts as user `local`
  (seeded in `serverSetup`). Startup throws unless `HOST` is loopback, and
  middleware returns 403 for a non-loopback `Host`.
- Gotchas:
  - `better-auth` declares `peerOptional solid-js@^1`. Installing alongside
    Solid 2 fails with ERESOLVE. The fix in this repo is `overrides`, but
    overrides don't reach consumers (see 5).
  - Rate limiting logs "could not determine a client IP". Production needs
    `advanced.ipAddress` configured (trust `X-Forwarded-For` on Railway) or
    the socket IP passed through.

### 3. MCP: works

- `createMcpHandler` (server 2.4.0) is mounted in middleware at `/mcp`.
  Hosted and self-host modes wrap it in `requireMcpAuth(auth, …)` from
  `@better-auth/mcp` (`requiredScopes: ["resume:read"]`, JWT verified
  in-process against the JWT plugin's keys). Local mode skips OAuth but keeps
  the SDK's `hostHeaderValidationResponse` and `originValidationResponse`
  checks (`Origin: http://evil.example` gets 403).
- `scripts/mcp-client.mjs` (SDK client 2.4.0) runs the full flow against
  Postgres: PRM → AS metadata (`client_id_metadata_document_supported: true`)
  → 401 with `WWW-Authenticate` → DCR → authorize → `/consent` → consent POST
  → code with `iss` (RFC 9207 check passes) → tokens with
  `scope=resume:read offline_access` → `get_profile` and `export_pdf`.
- The legacy v1 SDK client negotiates `2025-11-25` against the same endpoint,
  and the v2 client negotiates 2026-07-28. Both work.
- Not exercised: CIMD end to end (it needs an HTTPS-hosted client metadata
  document) and MCP Inspector (SDK clients were used instead).
- Gotchas: Node's `fetch` always sends `sec-fetch-mode: cors`, so Better Auth
  answers `/oauth2/authorize` with `{redirect,url}` JSON instead of a 302.
  Browsers get the 302, but scripts must follow `url`. The v2 client warns
  unless the provider implements `discoveryState()`.

### 4. Drizzle: works, two gaps

- One `pg-core` schema and one `drizzle-kit generate`. The same `drizzle/`
  folder is applied at startup by `drizzle-orm/pglite/migrator` (on-disk dir)
  and `drizzle-orm/postgres-js/migrator`. `information_schema.columns` is
  identical: 146 columns, zero diff.
- Gap: PGlite 0.6.0 runs **Postgres 19** while the hosted container ran 17.
  Pin hosted to the newest major Railway offers, and run migration tests in
  CI against both PGlite and real Postgres.
- Gap: **two processes opened the same PGlite directory without error.**
  Nothing prevents corruption, so local mode needs its own lock file.
- Minor: `count(*)` comes back as a number from PGlite and a string from
  postgres-js (use `.mapWith(Number)`). postgres-js prints NOTICEs unless
  `onnotice` is set. Postgres can be unready at boot, so startup retries
  migration for about 30 s.

### 5. Packaging: works, ship the bundled variant

|                                                   | deps external (`npm pack`) | **bundled** (`npm run pack:bundled`)  |
| ------------------------------------------------- | -------------------------- | ------------------------------------- |
| tarball / unpacked                                | 203 kB / 447 kB            | 1.1 MB / 4.2 MB                       |
| runtime deps                                      | 14                         | 2 (`@electric-sql/pglite`, `pdfmake`) |
| installed node_modules                            | 109 MB                     | 54 MB                                 |
| cold `npx` (empty cache, empty dir) → healthy     | 20.8 s                     | 7.5 s                                 |
| first boot (incl. PGlite initdb + migrate ≈1.3 s) | 2.0 s                      | 1.4 s                                 |
| warm `npx` / direct `node bin`                    | n/a                        | 1.2 s / 0.4 s                         |

- PGlite's WASM ships correctly: `pglite.wasm` 9.5 MB, `pglite.data` 6.3 MB,
  and `initdb.wasm` load from `node_modules/@electric-sql/pglite/dist`. PGlite
  is 27 MB of the install and is the biggest dependency.
- The deps-external tarball installs **two copies of Solid**: 2.0.4 nested
  under the app, and 1.9.20 hoisted to the top level as an extraneous copy for
  better-auth's optional peer. The package's `overrides` don't apply to
  consumers. Bundling (`ssr: { noExternal: true, external: [pglite, pdfmake] }`)
  removes the problem and is about 3× faster cold. PGlite and pdfmake stay
  external because they read their own files (WASM, TTF) at runtime.
- The bundled build also passes the full OAuth and Postgres flow.

### 6. pdfmake 0.3 in Node: works

- `require("pdfmake")` with `addFonts(require("pdfmake/fonts/Roboto"))`
  loads the real Roboto TTFs from `node_modules/pdfmake/fonts` via
  `__dirname`. Output is `%PDF-1.3`, 31 kB, in about 110–160 ms.
- **Tailory's existing `src/lib/templates/modern.ts` and `pdf-renderer.ts`
  ran unchanged** (via a Vite `@` alias to `../../src`). The doc-definition
  code is already runtime-neutral, and only font registration differs
  (browser: `vfs_fonts`, Node: file paths).
- Gotcha (security): the Node build's default `localAccessPolicy` is
  "read any path", and remote URLs are fetched by default. Agent-supplied
  content could request `/etc/passwd` as an image or trigger SSRF. The spike
  locks file access to the font dir and denies URLs.

### 7. Docker + compose: works (podman)

- `Dockerfile` installs the **same bundled tarball** used by `npx`, so the
  two can't drift. The image is 293 MB on `node:24-slim`. `compose.yaml`
  runs the app with postgres:17-alpine. The full OAuth MCP flow passed
  against the container.
- podman-compose 1.0.6 ignores `depends_on: condition: service_healthy`. The
  app crashed with ECONNREFUSED until the DB retry above was added. Keep the
  retry: Railway doesn't guarantee start order either.

## Recommended layout

```
packages/core   resume schema, JSON Resume import/export, render model,
                pdfmake doc definitions (pure TS, browser + Node; proven above)
apps/app        Solid 2 start-mode app, published to npm as `tailory`:
                src/server/{config,db,auth,mcp,pdf}.ts, src/middleware.ts,
                drizzle/ migrations, bin/tailory.mjs, Dockerfile
```

- No `apps/cli`. The bin is about 20 lines that set local-mode env and call
  `serve()`, so it belongs in the app package and ships in the same tarball.
- No `packages/db` yet. Schema, migrations, and `getDb()` sit next to the
  server code, and the app is their only consumer. Split them out only if a
  second consumer appears.
- The current Astro marketing site can stay its own app (`apps/site`).

## Plan changes this spike suggests

1. Mount Better Auth and MCP in start-mode **middleware** (fetch-native,
   `event.request` → `Response`). No Hono needed.
2. **Ship the bundled server build** to npm with only PGlite and pdfmake as
   dependencies, and build the Docker image from that tarball.
3. **SSR on.** Gate pages in middleware. Server functions still check the
   user themselves.
4. Local mode needs a **PGlite lock file**, a loopback-only bind, and
   Host/Origin checks on every route.
5. Run CI migrations on **PGlite and real Postgres**, and keep the version gap
   in mind (19 vs 17).
6. Configure Better Auth's client IP source and pdfmake's access policies
   before hosting.

## Reproduce

```sh
npm install                      # needs the repo root installed (bun install) for the @ alias's tsconfig
npm run build && TAILORY_MODE=local HOST=127.0.0.1 PORT=4413 node dist/server/node.js
node scripts/mcp-client.mjs http://localhost:4413/mcp
podman run -d -p 4414:5432 -e POSTGRES_USER=tailory -e POSTGRES_PASSWORD=spike -e POSTGRES_DB=tailory postgres:17-alpine
TAILORY_MODE=selfhost TAILORY_EMAIL_PASSWORD=true DATABASE_URL=postgres://tailory:spike@localhost:4414/tailory \
  PORT=4415 SITE_URL=http://localhost:4415 node dist/server/node.js
node scripts/mcp-client.mjs http://localhost:4415/mcp --oauth
npm run pack:bundled && npx --package=.pack/tailory-spike-0.0.0-spike.1-bundled.tgz tailory
podman-compose up -d --build     # app on :4416
```
