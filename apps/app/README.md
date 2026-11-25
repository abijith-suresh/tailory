# tailory (server app)

The Tailory server app: a Solid 2 start-mode app with its own database. This first version is a
skeleton. It serves placeholder pages, keeps a database up to date, and runs in two modes. Sign-in
and the real screens come later. Not published to npm yet.

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

| Variable              | Meaning                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `TAILORY_MODE`        | `local` (default) or `server`                                        |
| `TAILORY_HOST`        | Address to bind. Local mode accepts loopback only; server: `0.0.0.0` |
| `PORT`                | Port (default 4413)                                                  |
| `TAILORY_DATA_DIR`    | Data folder (default `~/.tailory`)                                   |
| `DATABASE_URL`        | Postgres connection string. Without it, PGlite in the data folder    |
| `TAILORY_TRUST_PROXY` | `true` behind a reverse proxy. Reserved; nothing reads it yet        |

## Run it with Docker

The image installs the same tarball as the npm package. Build the tarball, then start the app with
Postgres:

```sh
npm ci
npm run pack:tarball --workspace tailory
docker compose -f apps/app/compose.yaml up --build
```

The app answers on `http://127.0.0.1:4413`. **Server mode has no sign-in yet**, so the compose file
publishes the port on this computer only; don't expose it. Set `POSTGRES_PASSWORD` to change the
database password. Without `DATABASE_URL`, the image keeps a PGlite database in its `/data` volume.

## Develop

```sh
npm run dev --workspace tailory          # vite dev on :4413, data in apps/app/.data
npm run test --workspace tailory
npm run test:smoke --workspace tailory   # pack, install in an empty folder, start, check
npm run db:generate --workspace tailory  # after editing src/server/db/schema.ts
```

Migrations in `drizzle/` run at startup, on PGlite and on Postgres. The Postgres test runs when
`TAILORY_TEST_DATABASE_URL` points at a scratch database; it drops and recreates the `public`
schema.

The server build bundles every dependency except PGlite, which loads its WASM files from its own
package folder, so the installed package depends on PGlite alone.
