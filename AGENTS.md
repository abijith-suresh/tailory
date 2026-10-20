# tailory — agent brief
Tailory is a browser-based resume editor: people import a PDF, DOCX, or JSON Resume-style file, edit structured data, preview it live, and export a text PDF or JSON. It is for people who want a private, no-account resume tool rather than another cloud profile.

## The Project
Core promise: resume content stays in the browser. Import, editing, preview, export, autosave, and named drafts all happen locally, and content is never uploaded to an application server. Drafts live in IndexedDB and disappear with site data; public copy must say so.

Non-goals: accounts, signup, sync, or collaboration; server-side resume processing; an offline-first PWA or service worker; public sharing, design or page-format controls, or extra templates before that work is tracked and tested; ATS scoring or hiring guarantees; claims of full validation against the official JSON Resume schema; speculative code for possible future expansion.

Status: live.

## How I Work Here
- Run `bun run verify` before handoff. Add focused regression tests for the behavior you touched; CI owns the full suite.
- Use Conventional Commits, with types from `commitlint.config.ts`. Squash merge, never commit to `main`, and keep one focused PR open until review.
- Keep interactive UI in SolidJS; do not introduce React or Vue.
- Keep `pdfmake` dynamically imported in browser runtime code; a module-scope import breaks the client-only build.
- Keep parser, editor, preview, export, and draft behavior aligned. Update README when user-visible behavior, limits, or supported JSON fields change; never advertise unimplemented features.

## Sources of Truth
| Fact | Where |
|---|---|
| Product intent | § The Project (this file) |
| Runtime behavior | code + tests |
| Commands & deps | package.json |
| Commit rules | commitlint.config.ts |
| User-visible behavior & JSON Resume contract | README.md |

Code and tests are the authority; this file never overrides executable truth.

## Getting Around
- `src/lib/extraction/` — PDF.js worker is version-coupled; re-sync `public/pdf.worker.min.mjs` after `pdfjs-dist` upgrades or PDF import fails.
- `src/lib/templates/` — preview and PDF export share render models; template edits affect both paths.
