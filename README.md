# Tailory

Tailory is a resume editor that runs in your browser. Your resume never leaves your device.

Try it: https://tailory-nine.vercel.app

## What it does

- Open a PDF, DOCX or JSON Resume file and edit the result.
- See a live preview as you type.
- Pick from three templates: Modern, Minimal and Compact ATS.
- Export a PDF or a JSON file.
- Autosave and keep named drafts on your device.

JSON Resume support is not fully validated against the official schema.

## Privacy

There is no account and no server that processes resumes. Your resume stays in your browser. Autosaves and named drafts live in your browser's storage. Your browser removes them when you clear site data. The pages load fonts from Google Fonts, and your resume is not part of those requests.

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
- The interface font, [Geist](https://github.com/vercel/geist-font), is under the SIL Open Font License. Its text is in `public/fonts/OFL-Geist.txt`.
