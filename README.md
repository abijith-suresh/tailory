# Tailory

**A fully client-side resume editor.** Upload a PDF or DOCX, edit your resume in a structured form, preview it live, and export an ATS-compatible PDF — all in the browser. No server, no accounts, no data leaves your device.

## Features

- **Upload & Parse** — Drop a PDF or DOCX resume; Tailory extracts and structures your data automatically
- **Edit** — Full form editor for all resume sections (basics, work, education, skills, projects, certs)
- **Live Preview** — See a visual preview update in real time as you type
- **3 Templates** — Modern, Minimal, and Compact ATS layouts
- **Export** — Download a clean, ATS-safe PDF with one click
- **Draft Storage** — Auto-saves to IndexedDB; your work persists across sessions

## Stack

- [Astro 5](https://astro.build) — static site framework
- [SolidJS](https://solidjs.com) — reactive UI islands
- [Tailwind CSS v4](https://tailwindcss.com) — utility-first CSS
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Bun](https://bun.sh) — package manager and runtime
- [PDF.js](https://mozilla.github.io/pdf.js/) — client-side PDF text extraction
- [mammoth](https://github.com/mwilliamson/mammoth.js) — DOCX extraction
- [pdfmake](http://pdfmake.org) — programmatic ATS-safe PDF generation
- [idb](https://github.com/jakearchibald/idb) — typed IndexedDB wrapper

## Development

```sh
bun install      # install dependencies
bun dev          # start dev server at localhost:4321
bun build        # build for production
bun preview      # preview production build
bun run test     # run tests
```

## License

MIT
