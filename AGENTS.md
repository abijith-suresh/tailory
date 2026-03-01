# Agent & Contributor Instructions — Tailory

This is the canonical instruction file for AI agents and contributors. `CLAUDE.md` is a symlink to this file.

---

## Project Overview

**Tailory** is a client-side resume editor built with Astro 5, SolidJS, Tailwind CSS v4, TypeScript strict mode, and Bun. Users upload a PDF or DOCX resume, Tailory parses it into structured JSON, they edit it in a form-based UI, preview it live, and export a polished PDF — all without any server or account.

- **Live**: https://tailory-nine.vercel.app
- **Repo**: https://github.com/abijith-suresh/tailory
- **Deploy**: Vercel (static build, no SSR adapter)

---

## Project Structure

```
src/
├── components/
│   ├── upload/
│   │   └── FileUpload.tsx          SolidJS island — file drop zone + parse trigger
│   ├── editor/
│   │   ├── EditorShell.tsx         Top-level editor layout (SolidJS)
│   │   ├── DraftManager.tsx        Save/load/delete drafts via idb (SolidJS)
│   │   ├── BasicsForm.tsx          Name, contact, summary fields (SolidJS)
│   │   ├── WorkForm.tsx            Work experience entries (SolidJS)
│   │   ├── EducationForm.tsx       Education entries (SolidJS)
│   │   ├── SkillsForm.tsx          Skills list (SolidJS)
│   │   ├── ProjectsForm.tsx        Projects entries (SolidJS)
│   │   └── CertificatesForm.tsx    Certificates entries (SolidJS)
│   ├── preview/
│   │   └── ResumePreview.tsx       Live HTML preview + template switcher (SolidJS)
│   └── ui/
│       ├── FormField.tsx           Label + input wrapper
│       ├── Input.tsx               Controlled text input
│       ├── Textarea.tsx            Controlled textarea
│       ├── ReorderableList.tsx     Drag-to-reorder list
│       ├── ProcessingIndicator.tsx Spinner/status during parse
│       └── ErrorBoundary.tsx       SolidJS error boundary
├── lib/
│   ├── extraction/
│   │   ├── pdf.ts                  pdfjs-dist text extraction
│   │   └── docx.ts                 mammoth DOCX → plain text
│   ├── parser/
│   │   └── resume-parser.ts        Heuristic section detector + field extractor
│   ├── storage/
│   │   └── db.ts                   idb CRUD — DB: "tailory", store: "drafts", key: "autosave"
│   ├── export/
│   │   └── pdf-export.ts           pdfmake dynamic import + PDF download
│   └── templates/
│       ├── modern.ts               Modern template definition
│       ├── minimal.ts              Minimal template definition
│       └── compact-ats.ts          Compact ATS-safe template definition
├── types/
│   └── resume.ts                   JSON Resume schema types + TemplateId union type
├── store/
│   └── resume.ts                   createStore<ResumeSchema> + selectedTemplate signal
├── styles/
│   └── global.css                  Global styles — Tailwind imported here
├── layouts/
│   └── Layout.astro                Base HTML shell
├── pages/
│   ├── index.astro                 Landing page
│   └── editor.astro                Editor + preview split layout
├── test/
│   └── setup.ts                    Vitest setup — imports @testing-library/jest-dom
└── env.d.ts                        Astro type reference
```

---

## Critical Agent Rules

### SolidJS Islands

- All interactive UI is SolidJS components with `client:only="solid-js"` in `.astro` files
- Static Astro pages (landing, marketing) use no islands — pure Astro/HTML/CSS only
- Never use React or Vue — this project uses SolidJS exclusively

### pdfmake — MUST be dynamically imported

```ts
// CORRECT — inside an event handler or async function:
const pdfmake = await import("pdfmake/build/pdfmake");

// WRONG — never at module level:
import pdfmake from "pdfmake/build/pdfmake"; // ❌ breaks SSR/build
```

pdfmake accesses `window` on import, so it must be deferred to browser runtime.

### PDF.js Worker

The worker file is served statically:

```ts
import { GlobalWorkerOptions } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
```

The file lives at `public/pdf.worker.min.mjs` and must NOT be moved or renamed.

### Path Alias

`@/` maps to `src/` — always use this alias, never relative paths like `../../`.

Configured in **both** `astro.config.ts` AND `vitest.config.ts` — if you add a new config file that needs path resolution, add the alias there too.

### ESLint — Ignored Files

`public/pdf.worker.min.mjs` is in the ESLint ignore list. Never remove it — it's a vendored minified file.

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
| `bun run test`         | Run tests once (Vitest)            |
| `bun run test:watch`   | Run tests in watch mode            |
| `bun run test:ui`      | Open Vitest UI                     |

---

## Tailwind CSS v4

This project uses **Tailwind CSS v4**, which has a different setup from v3:

- **No `tailwind.config.*` file** — configuration is done in CSS
- **Import in CSS**: `@import "tailwindcss"` in `src/styles/global.css`
- **Vite plugin**: `@tailwindcss/vite` in `astro.config.ts` (not an Astro integration)
- **Custom theme**: Use `@theme` block in CSS instead of `theme.extend` in JS config

Example:

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
- **Path alias**: `@` maps to `src/` — configured in `tsconfig.json` as `"@/*": ["src/*"]`

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
- **Run with**: `bun run test` — NOT `bun test` (that runs Bun's native test runner, not Vitest)

### Mocking pdfjs-dist in tests

pdfjs-dist must always be mocked — it has a bundled worker that cannot run in jsdom:

```ts
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));
```

Current test count: 11 (9 parser + 1 pdf module export + 1 docx module export)

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
docs: update AGENTS.md for Tailory
chore: remove stale deploy workflow
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
3. Open a PR against `main` with `gh pr create`
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

### `audit.yml`

Runs weekly (Monday 03:00 UTC) and on manual trigger. Audits production dependencies with `bun audit --prod`.

### Deployment

Tailory deploys to **Vercel** automatically on push to `main`. No manual deployment step needed. The Vercel project is named `tailory` (scope: `abijiths-projects-1`). Build: `bun run build`, install: `bun install`, output: `dist/`.

---

## DevContainer

The `.devcontainer/` setup provides a consistent dev environment:

- **Base image**: `node:24-slim` with Bun and GitHub CLI installed
- **User**: `nodeuser` (non-root)
- **Port**: 4321 forwarded for Astro dev server
- **VSCode extensions**: Astro, ESLint, Prettier, Tailwind CSS IntelliSense, MDX, Path Intellisense, Auto Rename Tag, Code Spell Checker, Vitest Explorer
- **Post-create**: `bun install` runs automatically
