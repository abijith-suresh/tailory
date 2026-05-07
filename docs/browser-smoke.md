# Browser smoke suite

Tailory includes a deliberately small browser smoke suite for the highest-risk client-side flows.

## What it covers

- import a resume through the real browser upload flow
- make a follow-up edit in the editor
- trigger PDF export in-browser
- restore the autosave draft when the editor is reopened

## Why it stays small

The goal is not a large end-to-end pyramid. This suite is meant to catch release-blocking regressions in the app's most fragile browser-only paths without making CI noisy or slow.

## Running locally

```sh
bun run build
bun run test:smoke
```

## CI

GitHub Actions installs Chromium for Playwright and runs the smoke suite after the normal quality job passes.
