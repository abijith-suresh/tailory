# Contributing to Tailory

Tailory is a browser-only resume editor. Keep resume data in the browser, keep the product scope small, and keep the public copy aligned with what the app actually does.

## Development

Tailory is an npm workspace on Node 24; `mise.toml` pins the Node and npm versions. The app lives
in `apps/site` (`@tailory/site`); run commands from the repository root, which delegates to it.
The resume logic the app shares lives in `packages/core` (`@tailory/core`): types, JSON Resume
import and export, normalization, the text parser, and the template render models. Workspaces
import its TypeScript source directly; it has no build step. The server app lives in `apps/app`
(npm package `tailory`, not published yet); its README covers running it locally and in Docker.

```sh
npm ci
npm run dev
```

Browser tests need the Playwright browsers once per machine:

```sh
npx playwright install
npm run test:e2e:build
```

Run `npm run verify` before handoff; add focused tests for what you touched and leave the full
suite to CI. When you need to narrow down a failure, run the relevant script from `package.json`.

## Maintenance

When you upgrade `pdfjs-dist`, re-sync the worker that the browser loads:

```sh
npm run assets:pdf-worker
```

`apps/site/public/pdf.worker.min.mjs` must match the installed `pdfjs-dist` build. If it drifts, PDF import fails with an API/worker version mismatch. The guard in `apps/site/src/lib/extraction/pdf-worker-assets.test.ts` fails `npm run test` when the worker is out of date, so run the command above and commit the updated file as part of the upgrade.

## Contribution workflow

- Branch from the latest `main`.
- Never commit directly to `main`.
- Use SolidJS for interactive UI. Do not introduce React or Vue.
- Keep `pdfmake` dynamically imported in browser runtime code; a module-scope import breaks the
  client-only build.
- Preview and PDF export share render models under `packages/core/src/templates/`; template edits
  affect both paths.
- Keep `packages/core` free of I/O: no filesystem, network, DOM, IndexedDB, or storage access, and
  no Solid or Astro imports. Its type-check runs without DOM or Node types to hold that line. File
  extraction, drafts, and the PDF download stay in `apps/site`.
- Keep parser, editor, preview, export, and draft behavior aligned. Keep README and public copy
  accurate; never advertise unimplemented features.
- Add regression coverage when changing import, autosave, parsing, or export behavior.
- Use Conventional Commit titles; allowed types and header rules live in `commitlint.config.ts`.
- Open one focused pull request at a time and wait for review or merge feedback.
- Squash merge is the expected merge strategy.

## Releases

Changesets versions the workspace packages: `tailory` (`apps/app`), `@tailory/site` (`apps/site`),
and `@tailory/core` (`packages/core`). All three are private, and nothing is published to npm yet.

When a pull request changes what a package ships, add a Changeset:

```sh
npx changeset
```

Pick each package you changed, leave the bump at patch, write one line for the changelog, and
commit the file it creates under `.changeset/`. CI's `changeset` job fails without one; tests,
READMEs, and pull requests titled `docs`, `ci`, `chore`, `style`, or `test` are exempt.

The Release workflow collects merged Changesets into a "chore: version packages" pull request
that bumps the versions and updates each package's `CHANGELOG.md`. Merging it records the
release. Tags and GitHub Releases wait until publishing is enabled. Do not hand-edit versions.
