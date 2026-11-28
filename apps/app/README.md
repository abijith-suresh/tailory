# tailory (server app)

The Tailory server app: a Solid 2 start-mode app with its own database. It runs in two modes,
handles sign-in, and serves an MCP endpoint with the resume tools agents use. The Applications
and Application screens work; Profile and Connect an agent are still empty. Dev builds only; no
stable release yet.

## Try the dev build

Every change to this app or `packages/core` on `main` publishes a dev build to npm under the `dev`
tag, versioned `0.0.0-dev.<UTC timestamp>`, and to GHCR as `dev` and the same version. Dev builds
are untested snapshots, not releases. Until the first stable release, npm's `latest` tag also
points at the newest dev build.

```sh
npx tailory@dev
# or install it:
npm i -g tailory@dev
tailory
```

The image runs in server mode, so it needs a secret, its public URL, and a sign-in method:

```sh
docker run --rm -p 127.0.0.1:4413:4413 -v tailory-data:/data \
  -e TAILORY_AUTH_SECRET="$(openssl rand -hex 32)" \
  -e TAILORY_PUBLIC_URL=http://127.0.0.1:4413 \
  -e TAILORY_AUTH_EMAIL_PASSWORD=true \
  ghcr.io/abijith-suresh/tailory:dev
```

A new secret on each run signs everyone out; reuse one to keep sessions. Pin a build with
`tailory@0.0.0-dev.<timestamp>` or the image tag of the same name.

## Run it on your computer

From the repository root:

```sh
npm ci
npm run build --workspace tailory
node apps/app/bin/tailory.mjs
```

`tailory` starts in **local mode** and prints its address (default `http://127.0.0.1:4413`). Local
mode has no sign-in, so it listens on loopback only and refuses requests whose `Host` or `Origin`
isn't a loopback address. Data lives in PGlite under `~/.tailory`; only one Tailory can use a data
folder at a time.

```text
-p, --port <port>      Port to listen on (default 4413, env PORT)
-d, --data-dir <path>  Where Tailory keeps its data (default ~/.tailory, env TAILORY_DATA_DIR)
-h, --help             Show the help
-v, --version          Show the version
```

| Variable              | Meaning                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `TAILORY_MODE`        | `local` (default) or `server`                                                |
| `TAILORY_HOST`        | Address to bind. Local mode accepts loopback only; server: `0.0.0.0`         |
| `PORT`                | Port (default 4413)                                                          |
| `TAILORY_DATA_DIR`    | Data folder (default `~/.tailory`)                                           |
| `DATABASE_URL`        | Postgres connection string. Without it, PGlite in the data folder            |
| `TAILORY_TRUST_PROXY` | `true` behind a reverse proxy: take the client IP from its `X-Forwarded-For` |

## Sign-in (server mode)

Local mode has no sign-in: every request acts as one local user, created on first start. Server
mode needs a secret, the public URL, and at least one sign-in method, or it refuses to start.

| Variable                                                   | Meaning                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `TAILORY_AUTH_SECRET`                                      | Random string of 32+ characters (`openssl rand -hex 32`)                                      |
| `TAILORY_PUBLIC_URL`                                       | Where people reach Tailory, such as `https://tailory.example.com`. HTTPS, except on localhost |
| `TAILORY_AUTH_EMAIL_PASSWORD`                              | `true` for email and password accounts (self-hosting)                                         |
| `TAILORY_GITHUB_CLIENT_ID`, `TAILORY_GITHUB_CLIENT_SECRET` | Both set: GitHub sign-in. Callback `<public URL>/api/auth/callback/github`                    |
| `TAILORY_GOOGLE_CLIENT_ID`, `TAILORY_GOOGLE_CLIENT_SECRET` | Both set: Google sign-in. Callback `<public URL>/api/auth/callback/google`                    |

Signed-out page requests go to `/sign-in`. Settings has a button that deletes your account and
everything Tailory keeps for it.

## Screens

**Applications** (`/`) lists your applications grouped by status: offer, interviewing, applied,
drafting, then rejected and withdrawn. Each row shows the company, role, status, page result and
when it last changed. Search matches the company or role; archived applications stay hidden
until you tick "Show archived". "New application" asks for the company, role, and optionally the
posting link and job description, for when you aren't using an agent.

**Application** (`/applications/<id>`) shows the resume as it will print, its page result ("1
page, fits", "about 3 lines over 1 page"), the job details and notes, the status, and Archive.
Recent changes lists the application's change log, newest first, with who made each change (you
or the agent by name) and Undo; an undo that a later change is in the way of says so and changes
nothing. Below that you tailor the resume: tick or untick profile entries and bullets, reword a
line for this application only (it shows the profile text it was based on and flags it when the
profile has changed since), set the page target and whether spacing may tighten to meet it,
choose the template, and move sections up or down. Every edit saves at once and is logged.
Download PDF and Download JSON use the same signed links as `export_resume`.

The preview is the PDF the server prints, drawn page by page with pdf.js in the browser. Phones
don't show PDFs in a frame, so canvases are the one way that looks the same everywhere. pdf.js
loads only on this screen.

## MCP

Agents connect to `<address>/mcp` over Streamable HTTP. It is stateless: no `Mcp-Session-Id`, so
any instance can answer any request.

- **Protocol revisions:** 2026-07-28 only. The list is `MCP_PROTOCOL_VERSIONS` in
  `src/server/mcp.ts`. A request for any other revision, including a 2025 `initialize`
  handshake, gets error -32022 naming the supported ones.
- **Local mode:** no OAuth; Host and Origin must be loopback.
- **Server mode:** OAuth through Tailory's own authorization server (`/api/auth`), with the
  `tailory` scope. Clients identify themselves with a Client ID Metadata Document (CIMD), or
  register with Dynamic Client Registration, which 2026-07-28 deprecates but still allows.
  Discovery: `/.well-known/oauth-protected-resource/mcp` and
  `/.well-known/oauth-authorization-server/api/auth`. Authorization responses carry `iss`
  (RFC 9207).

### Tools

Agents work through eight tools (`src/server/tools.ts`). Every write acts as the agent: the change
log records it with the OAuth client's registered name, or in local mode the name the client
sends. Every write answers with the page result from `src/server/render.ts` (such as "1 page,
fits" or "about 3 lines over 1 page") and the application's link in the web app
(`<address>/applications/<id>`). Each tool answers with a short line of text plus structured
content; a bad id or input answers with `isError` and what to do instead.

| Tool                 | Does                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `get_profile`        | The profile, with an id on every entry and bullet                                                      |
| `update_profile`     | `replace` the whole profile, merge `basics`, `add` entries or bullets, `change` or `remove` them by id |
| `list_applications`  | Filter by `status`, `archived` (`exclude` by default, `include`, `only`) and a text `query`            |
| `create_application` | Company, role, posting URL, job description; starts from the whole profile                             |
| `get_application`    | Job details, tailoring, the resume as it will print, stale rewordings, the page result                 |
| `tailor_application` | `exclude`/`include` item ids, `reword` lines, `sectionOrder`, `template`, `pageTarget`, `autoFit`      |
| `update_application` | Status, notes, dates, job details, archive or unarchive                                                |
| `export_resume`      | A download link for an application's or the profile's PDF or JSON Resume                               |

Download links (`/download/<token>`) carry a token signed with a key derived from
`TAILORY_AUTH_SECRET` (in local mode, a key made at start-up, so links end when Tailory stops). The
token names the user, the resume and the format, and lasts an hour. It works in a browser that
isn't signed in, which is where a person opens a link their agent hands them, and the download
reads the resume with the token's user id, so it can't open anyone else's.

`src/server/mcp-flow.test.ts` drives the endpoint with the official SDK client
(`@modelcontextprotocol/client`, protocol 2026-07-28): discovery, CIMD and DCR sign-in, token,
`tools/list` in server mode, no OAuth in local mode, and -32022 for 2025-11-25. It drives the
whole flow over MCP in both modes (`src/server/testing/resume-flow.ts`): set up a profile, create
an application, tailor it to one page, change its status, list it, and download the PDF; and
checks that a second user can't reach the first user's application by id.
It runs on PGlite in every test run and on Postgres in CI's app-postgres job. CI's app-package job
also runs the DCR flow against the Docker image (`src/server/remote.test.ts`).

## Run it with Docker

The image installs the same tarball as the npm package. To build it from source, build the
tarball, then start the app with Postgres:

```sh
npm ci
npm run pack:tarball --workspace tailory
docker compose -f apps/app/compose.yaml up --build
```

Set `TAILORY_AUTH_SECRET` first (`export TAILORY_AUTH_SECRET="$(openssl rand -hex 32)"`). The app
answers on `http://127.0.0.1:4413` with email and password sign-in on. The compose file publishes
the port on this computer only; to put it online, run it behind an HTTPS reverse proxy and set
`TAILORY_PUBLIC_URL` and `TAILORY_TRUST_PROXY=true`. Set `POSTGRES_PASSWORD` to change the
database password. Without `DATABASE_URL`, the image keeps a PGlite database in its `/data` volume.

## Develop

```sh
npm run dev --workspace tailory          # vite dev on :4413, data in apps/app/.data
npm run test --workspace tailory
npm run test:smoke --workspace tailory   # pack, install in an empty folder, start, check
npm run db:generate --workspace tailory  # after editing src/server/db/schema.ts
npm run auth:generate --workspace tailory  # after changing Better Auth plugins, then db:generate
```

In dev, `/dev/components` shows every shared component for design review; production builds
leave it out.

Styles are plain CSS in `src/styles/app.css`, in cascade layers. The tokens are the marketing
site's (`apps/site/src/styles/global.css`); change both together. Components in
`src/components` have tests that render them on the server and query the HTML.

`npm run dev` starts local mode. For server mode, set `TAILORY_MODE=server` and the sign-in
variables above, with `TAILORY_PUBLIC_URL=http://localhost:4413`.

Migrations in `drizzle/` run at startup, on PGlite and on Postgres. The Postgres tests run when
`TAILORY_TEST_DATABASE_URL` points at a scratch database; they drop and recreate the `public`
schema. Both drivers must build the columns in `src/server/db/__snapshots__/columns.txt`.

The server build bundles every dependency except PGlite, which loads its WASM files from its own
package folder, so the installed package depends on PGlite alone. That includes pdfmake:
`src/server/render.ts` loads its minified browser build and Roboto once per process to fit, print
and export resumes, and the build emits it as `dist/server/render.js` so the smoke test can print
from the installed package. Bundling also keeps Better Auth's
optional `solid-js@^1` peer out of installs. In the browser, use `better-auth/client`, never
`better-auth/solid`, which is written for Solid 1.
