# Contributing to Tailory

Tailory is a browser-only resume editor. Keep resume data in the browser, keep the product scope small, and keep the public copy aligned with what the app actually does.

## Development

Install dependencies and run the local app with Bun:

```sh
bun install
bun run dev
```

Run the full quality gate before pushing:

```sh
bun run verify
```

Individual checks are available when you need to narrow down a failure:

```sh
bun run type-check
bun run lint
bun run format:check
bun run test
bun run test:coverage
bun run build
```

## Maintenance

When you upgrade `pdfjs-dist`, re-sync the worker that the browser loads:

```sh
bun run assets:pdf-worker
```

`public/pdf.worker.min.mjs` must match the installed `pdfjs-dist` build. If it drifts, PDF import fails with an API/worker version mismatch. The guard in `src/lib/extraction/pdf-worker-assets.test.ts` fails `bun run test` when the worker is out of date, so run the command above and commit the updated file as part of the upgrade.

## Contribution workflow

- Branch from the latest `main`.
- Never commit directly to `main`.
- Use SolidJS for interactive UI. Do not introduce React or Vue.
- Keep parser, editor, preview, export, and draft behavior aligned.
- Add regression coverage when changing import, autosave, parsing, or export behavior.
- Use Conventional Commit titles: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, or `build`.
- Open one focused pull request at a time and wait for review or merge feedback.
- Squash merge is the expected merge strategy.

## Releases

Tailory uses Release Please for version bumps, changelog entries, Git tags, and GitHub Releases.

These files and conventions stay aligned:

- `package.json` contains the current package version.
- `.release-please-manifest.json` contains Release Please's tracked version.
- `CHANGELOG.md` contains generated release history after the first baseline release.
- Git tags use the `X.Y.Z` format with no `v` prefix or component prefix.
- GitHub Releases use the matching tag.

The normal release flow is:

1. Merge conventional-commit pull requests into `main`.
2. The Release Please workflow runs on every push to `main`.
3. Release Please opens or updates a release pull request when it finds user-facing commits since the last release.
4. Review and merge the generated release pull request.
5. Release Please creates the matching tag and GitHub Release on the next workflow run.

Do not hand-edit package versions for normal releases or curate generated changelog entries. Keep the workflow pointed at `release-please-config.json` and `.release-please-manifest.json`. The workflow uses the `RELEASE_PLEASE_TOKEN` secret.

The initial reset uses `0.0.1` as the package version and `0.0.0` as the temporary manifest version. Release Please creates the first `0.0.1` release pull request. After that release, the package, manifest, changelog, tag, and GitHub Release should agree.

If release history needs repair:

1. Decide the correct release baseline and tag.
2. Update `package.json`.
3. Update `.release-please-manifest.json`.
4. Keep the Release Please `initial-version` and `bootstrap-sha` options unset; the release automation test asserts they stay undefined.
5. Repair `CHANGELOG.md` compare links if a changelog already exists.
6. Confirm that the latest real tag matches the version source of truth before re-enabling automation.
