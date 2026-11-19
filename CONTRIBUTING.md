# Contributing

These rules apply to people and coding agents alike. Read [AGENTS.md](AGENTS.md) first for what the product is and what is out of scope.

## Setup

`mise.toml` pins the Bun and Node versions, and the `packageManager` field in `package.json` must match its Bun version.

```bash
mise install
bun install --frozen-lockfile
bun run dev
```

Run the commands below with `mise exec --` if mise is not activated in your shell.

## Checks

| Command                  | What it does                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `bun run verify`         | Type check, lint, format check, unit tests with coverage, and build. Run before push. |
| `bun run test:e2e:build` | Build, then run the Playwright browser tests.                                         |
| `bun run format`         | Fix formatting (Biome).                                                               |

Git hooks run on your machine. `pre-commit` runs Biome on staged files, `commit-msg` runs commitlint, and `pre-push` runs `bun run verify`. Install the browsers once with `bunx playwright install chromium firefox webkit`.

Add a focused test for the behavior you change, beside the module it covers. Add a regression test when you change import, autosave, parsing or export. Do not lower the coverage thresholds to remove a test.

## Making a change

1. Branch from the latest `main` with a kebab-case name and a type prefix, such as `fix/docx-heading-import`. Do not commit to `main`.
2. Keep the change small and focused.
3. Use Conventional Commits for commits and for the PR title, for example `fix: keep dates when importing a docx`. The allowed types are in `commitlint.config.ts`, and the header is at most 72 characters. Pull requests are squash merged, so the title becomes the commit.
4. Run `bun run verify` and open one pull request.

Releases are automated from the commit messages.

## Rules that break the product

- Resume data never leaves the browser. No uploads, beacons, or error reports that contain resume content.
- Use SolidJS for interactive UI. Do not add React or Vue.
- Import `pdfmake` dynamically in browser code. A module-scope import breaks the client-only build.
- Preview and PDF export share the render models in `src/lib/templates/`. A template change affects both.
- Keep `public/pdf.worker.min.mjs` in sync with `pdfjs-dist`. After you upgrade it, run `bun run assets:pdf-worker` and commit the result. A test in `src/lib/extraction/pdf-worker-assets.test.ts` fails when they drift.
- Do not describe or add features that are not implemented.

## Code style

- Follow the existing Astro, SolidJS, TypeScript and Tailwind patterns, and prefer small explicit modules over generic abstractions.
- Biome handles formatting and lint rules. `.editorconfig` sets the rest.
- Add comments only where the behavior is not obvious.

## Writing copy

- Use sentence case, short sentences and "you".
- Describe only what the product does today.
- Never call opening a file "upload". Use "open" or "choose".
- Use one term per feature.
