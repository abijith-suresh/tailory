# Agent & Contributor Instructions — agentic-astro

This is the canonical instruction file for AI agents and contributors. `CLAUDE.md` is a symlink to this file.

---

## Project Overview

This is **agentic-astro** — an Astro 5 starter kit built for AI-assisted development. It uses Tailwind CSS v4, TypeScript strict mode, and Bun as the package manager. The stack is intentionally minimal and opinionated so that an AI coding agent can onboard instantly with zero ambiguity.

---

## Project Structure

```
src/
├── layouts/
│   └── Layout.astro       # Base HTML shell — extend this for all pages
├── pages/
│   └── index.astro        # Entry point
├── styles/
│   └── global.css         # Global styles — Tailwind is imported here
├── test/
│   └── setup.ts           # Vitest setup — imports @testing-library/jest-dom
└── env.d.ts               # Astro type reference
```

---

## Dev Commands

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `bun dev`              | Start dev server at localhost:4321 |
| `bun build`            | Build for production to `dist/`    |
| `bun preview`          | Preview production build           |
| `bun run type-check`   | Run TypeScript type checking       |
| `bun run lint`         | Run ESLint                         |
| `bun run lint:fix`     | Run ESLint with auto-fix           |
| `bun run format`       | Format all files with Prettier     |
| `bun run format:check` | Check formatting without writing   |
| `bun run test`         | Run tests once                     |
| `bun run test:watch`   | Run tests in watch mode            |
| `bun run test:ui`      | Open Vitest UI                     |

---

## Tailwind CSS v4

This project uses **Tailwind CSS v4**, which has a different setup from v3:

- **No `tailwind.config.*` file** — configuration is done in CSS
- **Import in CSS**: `@import "tailwindcss"` in `src/styles/global.css`
- **Vite plugin**: `@tailwindcss/vite` in `astro.config.ts` (not an Astro integration)
- **Custom theme**: Use `@theme` block in CSS instead of `theme.extend` in JS config

Example custom theme in CSS:

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(60% 0.2 250);
  --font-sans: "Inter", sans-serif;
}
```

---

## TypeScript

- **Strict mode** via `astro/tsconfigs/strict`
- **Path alias**: `@` maps to `src/` — use `@/components/Foo.astro` instead of relative paths
- `tsconfig.json` paths: `"@/*": ["src/*"]`

---

## ESLint

Config: `eslint.config.ts` (flat config format)

Key rules:

- `no-console`: warn (allows `console.warn` and `console.error`)
- `sort-imports`: error (case-insensitive, declaration sort ignored)
- `@typescript-eslint/no-unused-vars`: error (ignores `_`-prefixed names)
- `astro/no-unused-css-selector`: warn
- `astro/prefer-class-list-directive`: warn
- `prefer-const`, `no-var`: error

Run: `bun run lint` / `bun run lint:fix`

---

## Prettier

Config: `.prettierrc`

Key settings:

- `printWidth: 100`
- `semi: true`
- `singleQuote: false`
- `trailingComma: "es5"`
- Astro plugin enabled for `.astro` files

Run: `bun run format` / `bun run format:check`

---

## Testing (Vitest)

Config: `vitest.config.ts`

- **Environment**: jsdom
- **Globals**: enabled (no need to import `describe`, `it`, `expect`)
- **Setup file**: `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- **Test files**: `src/**/*.{test,spec}.{js,ts}`

Example test:

```ts
import { expect, it } from "vitest";

it("adds numbers", () => {
  expect(1 + 1).toBe(2);
});
```

---

## Git Workflow

### Commit Convention

Uses [Conventional Commits](https://www.conventionalcommits.org/) via commitlint.

Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`

Format: `<type>(<optional scope>): <description>`

Examples:

```
feat: add hero section
fix: correct mobile nav z-index
docs: update README with setup steps
chore: upgrade astro to v5.18
```

### Branch Naming

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

### Pre-commit Hooks (Husky)

- **pre-commit**: runs `lint-staged` (ESLint + Prettier on staged files)
- **commit-msg**: runs `commitlint` to validate commit message format

### PR Flow

1. Create a branch from `main`
2. Make changes and commit with conventional commit format
3. Open a PR against `main`
4. CI must pass before merging
5. Squash merge preferred

---

## CI/CD

### `ci.yml`

Triggered on push to `main` and all PRs. Runs:

1. Type check (`|| true` — non-blocking)
2. Lint
3. Format check
4. Test
5. Build

### `deploy.yml`

Triggered on push to `main`. Deploys to GitHub Pages using `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.

Requires: GitHub Pages enabled in Settings → Pages → Source: GitHub Actions.

### `audit.yml`

Runs weekly (Monday 03:00 UTC) and on manual trigger. Audits production dependencies with `bun audit --prod`.

---

## DevContainer

The `.devcontainer/` setup provides a consistent dev environment:

- **Base image**: `node:24-slim` with Bun and GitHub CLI installed
- **User**: `nodeuser` (non-root)
- **Port**: 4321 forwarded for Astro dev server
- **VSCode extensions**: Astro, ESLint, Prettier, Tailwind CSS IntelliSense, MDX, Path Intellisense, Auto Rename Tag, Code Spell Checker, Vitest Explorer
- **Post-create**: `bun install` runs automatically

---

## Post-Init Checklist

After clicking "Use this template" on GitHub:

1. **Clone** the new repo locally
2. **Install dependencies**: `bun install`
3. **Update `package.json`**: change `name` from `"agentic-astro"` to your project name
4. **Update `astro.config.ts`**: set `site` and `base` for GitHub Pages
   ```ts
   site: "https://YOUR-USERNAME.github.io",
   base: "/YOUR-REPO-NAME/",
   ```
5. **Update `.devcontainer/devcontainer.json`**: change the `name` field
6. **Enable GitHub Pages**: Settings → Pages → Source: GitHub Actions
7. **Replace this AGENTS.md**: with project-specific instructions (or keep and extend)
8. **Make initial commit**: `git commit -m "chore: init from agentic-astro"`
