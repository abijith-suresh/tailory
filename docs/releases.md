# Releases

Tailory uses **Release Please** as the single release manager for version bumps, changelog entries, Git tags, and GitHub releases.

## Source of truth

These files and conventions must stay aligned:

- `package.json` — current published version
- `.release-please-manifest.json` — Release Please's tracked version for the root package
- `CHANGELOG.md` — generated release history and compare links
- Git tags in the format `vX.Y.Z`
- GitHub Releases created from those tags

If one of these needs to change, update the others in the same pull request.

## Normal release flow

1. Merge conventional-commit PRs into `main`.
2. The `Release Please` workflow runs on every push to `main`.
3. If there are user-facing commits since the latest release tag, Release Please opens or updates a PR like `chore(main): release 0.6.2`.
4. Review that PR's generated version bump and changelog updates.
5. Merge the release PR into `main`.
6. On the next workflow run, Release Please creates the `vX.Y.Z` tag and the matching GitHub Release.

## Maintainer rules

- Do **not** hand-edit version numbers in `package.json` for normal releases.
- Do **not** manually curate new changelog entries below the automated handoff line in `CHANGELOG.md`.
- Keep Release Please responsible for version, changelog, tag, and GitHub Release naming.
- Keep tags in the plain `vX.Y.Z` format — no component prefix.
- Keep the workflow pointed at `release-please-config.json` and `.release-please-manifest.json`.

## Credentials

The workflow uses `RELEASE_PLEASE_TOKEN` so release activity can create or update pull requests and continue the normal GitHub automation flow.

## Baseline and recovery

The current automated baseline is anchored from the bootstrap SHA in `release-please-config.json` and the root version in `.release-please-manifest.json`.

If release history ever needs repair:

1. decide the correct release baseline and tag
2. update `package.json`
3. update `.release-please-manifest.json`
4. repair `CHANGELOG.md` compare links
5. confirm the latest real tag still matches the version source of truth before re-enabling automation
