# Agent Instructions — Tailory

## Overview

- Tailory is a client-side resume editor built with Astro and SolidJS.
- Users import PDF or DOCX resumes, edit structured data, preview live, and export a PDF.

## Stack

- Astro 5
- SolidJS islands
- Tailwind CSS v4
- TypeScript strict mode
- Bun

## Commands

- Install deps: `bun install`
- Dev server: `bun run dev`
- Quality gate: `bun run verify`
- Individual steps: `bun run type-check`, `bun run lint`, `bun run format:check`, `bun run test`, `bun run build`

## Project Map

- `src/components/upload/`: file ingestion UI
- `src/components/editor/`: editor forms and draft management
- `src/components/preview/`: live resume preview
- `src/lib/extraction/`: PDF and DOCX text extraction
- `src/lib/parser/`: resume parsing heuristics
- `src/lib/export/pdf-export.ts`: PDF export
- `src/store/resume.ts`: shared resume state

## Hard Rules

- Use SolidJS for interactive UI. Do not introduce React or Vue.
- `pdfmake` must stay dynamically imported inside browser runtime code. Do not import it at module scope.
- Keep `public/pdf.worker.min.mjs` at the same path and keep `GlobalWorkerOptions.workerSrc` pointed to `/pdf.worker.min.mjs`.
- Use the `@/` path alias for `src` imports.
- Preserve the current browser-only workflow unless the user explicitly asks for server features.

## Git And CI

- Branch from the latest `main` before starting changes.
- Never commit directly to `main`.
- Commit and PR titles must use Conventional Commits: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`.
- Before push, run `bun run verify`.
- `pre-commit` runs `lint-staged`, `commit-msg` runs `commitlint`, and `pre-push` runs `bun run verify`.
- CI enforces `quality` and `pr-title` checks on pull requests.
- Squash merge is the expected merge strategy.
