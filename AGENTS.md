# Agent instructions for Tailory

## Overview

- Tailory is a client-side resume editor built with Astro and SolidJS.
- Users import PDF, DOCX, or JSON Resume-style files, edit structured data, preview it live, and export a PDF or JSON document.

## Product truth

This section is the product source of truth. Update it before changing product scope, promises, or non-goals. Code and public copy follow this section.

### Core promise

- Keep resume import, editing, preview, and export in the browser.
- Do not upload resume content to an application server.
- Do not require accounts, signups, login, or collaboration features.
- Keep drafts local and explain that IndexedDB storage is cleared with site data.
- Keep public copy honest about parser limits and the fields users can edit.

### Current product surface

- Import PDF, DOCX, and JSON Resume-style documents.
- Edit basics, summary, work, education, skills, projects, certifications, languages, interests, and references.
- Preview resumes with Modern, Minimal, and Compact ATS templates.
- Export PDF and JSON documents.
- Store autosaves and named drafts locally in IndexedDB.
- Render and preserve volunteer work, awards, and publications, although those sections do not yet have editor forms.

### Non-goals

The product does not include, and must not gain without updating this section first:

- server-side resume processing, accounts, sync, or collaboration
- an offline-first PWA or service worker
- a claim of full validation against the official JSON Resume schema package
- ATS scoring or guarantees about hiring outcomes
- public sharing, design controls, page-format controls, or additional templates before their tracked work is implemented and tested
- speculative code kept only for possible future expansion

## Stack

- Astro 7
- SolidJS islands
- Tailwind CSS v4
- TypeScript strict mode
- Bun

## Commands

- Install dependencies: `bun install`
- Dev server: `bun run dev`
- Quality gate: `bun run verify`
- Individual checks: `bun run type-check`, `bun run lint`, `bun run format:check`, `bun run test`, `bun run build`

## Project map

- `src/components/upload/`: upload flow code that must remain aligned with the active editor entry point
- `src/components/editor/`: editor forms, navigation, and draft management
- `src/components/preview/`: live resume preview
- `src/lib/extraction/`: PDF and DOCX text extraction
- `src/lib/parser/`: resume parsing heuristics
- `src/lib/export/pdf-export.ts`: PDF export
- `src/store/resume.ts`: shared resume state

## Hard rules

- Use SolidJS for interactive UI. Do not introduce React or Vue.
- Keep `pdfmake` dynamically imported inside browser runtime code. Do not import it at module scope.
- Keep `public/pdf.worker.min.mjs` at the same path and keep `GlobalWorkerOptions.workerSrc` pointed to `/pdf.worker.min.mjs`.
- Use the `@/` path alias for `src` imports.
- Preserve the current browser-only workflow unless the user explicitly asks for server features.
- Keep parser, editor, preview, export, and draft behavior aligned with the product truth.
- Add regression coverage for import, autosave, parsing, and export behavior when changing those paths.

## Documentation

- `README.md` describes current user-visible behavior.
- `docs/json-resume.md` describes the supported JSON Resume-style contract.
- `docs/releases.md` describes Release Please and the baseline recovery process.
- Keep public copy and documentation aligned with the product truth. Do not advertise unimplemented features.

## Git and CI

- Branch from the latest `main` before starting changes.
- Never commit directly to `main`.
- Commit and PR titles must use Conventional Commits: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, or `build`.
- Before push, run `bun run verify`.
- `pre-commit` runs `lint-staged`, `commit-msg` runs `commitlint`, and `pre-push` runs `bun run verify`.
- CI enforces quality and PR-title checks on pull requests.
- Squash merge is the expected merge strategy.
- Open one focused PR at a time, then wait for review or merge feedback before continuing.
