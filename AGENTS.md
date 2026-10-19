# Tailory — agent brief
A browser-only resume editor for importing, editing, previewing, and exporting a resume without sending it to a server.

## The Project
Core promise: Keep resume import, editing, preview, and export in the browser. Do not upload resume content to an application server, require accounts, or add sync or collaboration.

Non-goals: server-side resume processing; accounts, sync, or collaboration; an offline-first PWA or service worker; claims of full JSON Resume schema validation; ATS scoring or hiring guarantees; public sharing, design or page-format controls, and extra templates before tracked work exists; speculative code for future expansion.

Today: import PDF, DOCX, and JSON Resume-style files; edit the standard resume sections; preview live with Modern, Minimal, and Compact ATS templates; export PDF and JSON; keep autosave and named drafts in IndexedDB. Volunteer work, awards, and publications render and round-trip but have no editor forms yet.

Status: live

Change this section before changing product scope, promises, or non-goals; code and public copy follow it. Drafts are local and disappear with site data, so say so publicly.

## How I Work Here
- Quality gate: `verify` — run before handoff.
- Commits: Conventional Commits; types live in commitlint.config.ts. Squash merges; never commit to main.
- Use Bun (`1.4.1`), Astro 7, SolidJS islands, Tailwind CSS v4, and TypeScript strict mode. Do not introduce React or Vue.
- `verify` runs type-check, lint, format check, coverage tests, and build. Playwright e2e is separate: `bun run test:e2e:build`.
- Keep `pdfmake` dynamically imported inside browser runtime code; never import it at module scope.
- Keep `public/pdf.worker.min.mjs` in place and `GlobalWorkerOptions.workerSrc` pointed at `/pdf.worker.min.mjs`; run `bun run assets:pdf-worker` after changing `pdfjs-dist` (a test fails on drift).
- Use the `@/` alias for `src` imports.
- Treat README as the public contract for supported JSON Resume fields, parser limits, and fields without editor controls. Update it with behavior changes and never advertise unimplemented features.
- Add regression coverage for import, autosave, parsing, export, and PDF worker sync changes.
- Keep parser, editor, preview, export, and storage behavior aligned.
- Release Please owns versions, `CHANGELOG.md`, tags, and GitHub Releases; do not hand-edit them for normal releases.

## Sources of Truth
| Fact | Where |
|---|---|
| Product intent | § The Project (this file) |
| Runtime behavior | code + tests |
| Commands & deps | package.json |
| Commit rules | commitlint.config.ts |
| User-visible behavior and JSON Resume contract | README.md |
| Contribution and release workflow | CONTRIBUTING.md |

Code and tests are the authority; this file never overrides executable truth.

## Getting Around
- `src/components/editor/` — editor forms, navigation, import/export command bar, draft management
- `src/components/preview/` — live resume preview
- `src/components/resume/` — shared resume document rendering
- `src/components/ui/` — shared UI primitives
- `src/lib/extraction/` — PDF and DOCX text extraction, PDF worker drift guard
- `src/lib/parser/` — resume parsing heuristics
- `src/lib/upload/` — upload validation and import routing
- `src/lib/export/` — PDF export
- `src/lib/templates/` — Modern, Minimal, and Compact ATS render models
- `src/lib/resume/` — JSON normalization/export and design data
- `src/lib/sections/` — section registry
- `src/lib/storage/` — IndexedDB drafts and autosave
- `src/store/resume.ts` — shared resume state
- `src/pages/`, `src/layouts/` — Astro routes and shell
- `tests/e2e/` — Playwright end-to-end specs
- `scripts/` — maintenance scripts such as PDF worker sync
