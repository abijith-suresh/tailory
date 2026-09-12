# Tailory

Tailory is a browser-based resume editor. Import a PDF, DOCX, or JSON Resume-style document, edit structured resume data, preview it live, and export an ATS-friendly PDF or JSON document.

## What Tailory does today

- **Client-side import**: Open PDF, DOCX, and `.json` resume files locally in your browser.
- **Structured editing**: Edit basics, summary, work, education, skills, projects, certifications, languages, interests, and references.
- **Live preview**: See the current resume render update as you edit.
- **Three templates**: Modern, Minimal, and Compact ATS.
- **Export**: Download a PDF or export the current resume as JSON.
- **Local drafts**: Autosave and named drafts are stored in IndexedDB on your device.

## Current limits

- Volunteer work, awards, and publications already render in preview/export and survive JSON round-trips, but are **not yet editable in the form UI**
- JSON Resume support is implemented through Tailory's normalization layer; it is **not yet formally validated against the official schema package**
- Tailory is browser-only and privacy-first, but it is **not an offline-first PWA**. There is no service worker, so the first load still depends on normal browser and network behavior.
- The preview is designed to stay close to export output, but the exported PDF remains the final source of truth

## JSON Resume support

Tailory supports JSON Resume-style import and export for the fields it models in its own resume schema.

Supported top-level sections are:

- `basics`
- `work`
- `volunteer`
- `education`
- `awards`
- `certificates`
- `publications`
- `skills`
- `languages`
- `interests`
- `references`
- `projects`

Tailory ignores `$schema` and `meta` during import. It normalizes supported content into its internal schema, removes internal entry IDs during export, rejects unknown top-level fields, and reports malformed section shapes instead of silently dropping them.

Tailory does not claim full validation against the upstream official JSON Resume schema package. Some supported sections can import, survive normalization, and render in preview and PDF export without having first-class editor controls yet.

Tailory rejects JSON files when the top-level value is not an object, a supported section has the wrong shape, required identity fields are missing, or unsupported top-level fields would be silently discarded.

## Privacy and storage

Tailory has no application backend, no accounts, and no server-side resume processing. Your resume data stays in your browser unless **you** choose to export it.

Drafts and autosaves are stored in IndexedDB. Clearing site data in your browser will remove them.

The site may load normal web assets, but resume content is not sent to an application server.

## Stack

- [Astro 7](https://astro.build)
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

Release and contribution workflow notes live in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
