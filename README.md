# Tailory

Tailory is a resume editor that runs in your browser. Your resume never leaves your device.

Try it: https://tailory-nine.vercel.app

## What it does

- Open a resume file and edit the result.
  - JSON Resume files and Tailory's own JSON export are read in full. Tailory skips fields it doesn't use and names them. Support is not fully validated against the official schema.
  - Text-based PDFs and DOCX files are read on a best-effort basis. Check what Tailory found before you export.
  - Scanned or image-only PDFs do not work, because they have no text to read. Tailory tells you when it finds none.
- See a live preview as you type.
- Choose a template: Modern, Minimal or Compact.
- Export a PDF or a JSON file.
- Autosave and keep named drafts on your device.

## Privacy

There is no account and no server that processes resumes. Your resume stays in your browser. Autosaves and named drafts live in your browser's storage. Your browser removes them when you clear site data. The site serves its own fonts, so no request goes to a font service.

## Run it locally

```bash
mise install
bun install --frozen-lockfile
bun run dev
```

`mise install` installs the Bun and Node versions in `mise.toml`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to make a change. To report a security problem or a privacy leak, see [SECURITY.md](SECURITY.md).

## Licence

Tailory's own code is MIT-licensed (see [LICENSE](LICENSE)). It ships other projects under their own licences:

- PDF import uses [PDF.js](https://github.com/mozilla/pdf.js), which is Apache-2.0. This includes `public/pdf.worker.min.mjs`.
- DOCX import uses [mammoth](https://github.com/mwilliamson/mammoth.js), which is BSD-2-Clause.
- Drafts use [idb](https://github.com/jakearchibald/idb), which is ISC.
- Exported PDFs embed Roboto, which comes with [pdfmake](https://github.com/bpampuch/pdfmake) and is under the SIL Open Font License. Its text is in `public/fonts/OFL-Roboto.txt`.
- The interface uses [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk) and [Geist Mono](https://github.com/vercel/geist-font), both under the SIL Open Font License. Their texts are in `public/fonts/OFL-HankenGrotesk.txt` and `public/fonts/OFL-GeistMono.txt`.
