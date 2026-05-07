# Tailory

**A fully client-side resume editor.** Import a PDF, DOCX, or JSON Resume file, edit structured resume data, preview it live, and export an ATS-friendly PDF or JSON document — all in the browser.

## What Tailory does today

- **Client-side import** — Open PDF, DOCX, and `.json` resume files locally in your browser
- **Structured editing** — Edit core sections in forms: basics, summary, work, education, skills, projects, and certifications
- **Live preview** — See the current resume render update as you edit
- **Three templates** — Modern, Minimal, and Compact ATS
- **Export** — Download a PDF or export the current resume as JSON
- **Local drafts** — Autosave and named drafts are stored in IndexedDB on your device

## Current limits

- Some schema-backed sections already render in preview/export and survive JSON round-trips, but are **not yet editable in the form UI**
- JSON Resume support is implemented through Tailory's normalization layer; it is **not yet formally validated against the official schema package**
- Tailory is browser-only and privacy-first, but it is **not an offline-first PWA** — there is no service worker, so the first load still depends on normal browser/network behavior
- The preview is designed to stay close to export output, but the exported PDF remains the final source of truth

## JSON Resume support

Tailory can import and export JSON Resume-style documents for the fields it currently supports. In practice:

- supported fields are normalized on import and exported back as clean JSON
- internal entry IDs are removed during export
- unsupported or non-standard shapes may be rejected or normalized away
- some fields Tailory can preserve or render are still not exposed in the editor UI

## Privacy and storage

Tailory has no application backend, no accounts, and no server-side resume processing. Your resume data stays in your browser unless **you** choose to export or share it.

Drafts and autosaves are stored in IndexedDB. Clearing site data in your browser will remove them.

## Stack

- [Astro 6](https://astro.build)
- [SolidJS](https://solidjs.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- [Bun](https://bun.sh)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [mammoth](https://github.com/mwilliamson/mammoth.js)
- [pdfmake](http://pdfmake.org)
- [idb](https://github.com/jakearchibald/idb)

## Development

```sh
bun install
bun run dev
bun run verify
```

Useful individual commands:

```sh
bun run type-check
bun run lint
bun run format:check
bun run test
bun run build
```

Release workflow notes live in [docs/releases.md](./docs/releases.md).

## License

MIT — see [LICENSE](./LICENSE).
