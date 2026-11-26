# @tailory/core

## 0.0.1

### Patch Changes

- 84e0ba3: Fit, print and export resumes on the server. `src/server/render.ts` fits an application or the bare profile to its page target and says how it falls ("1 page, fits", "about 3 lines over 1 page"), prints the PDF with the same tightening, and exports JSON Resume. The server build bundles pdfmake and Roboto, so the installed package still depends on PGlite alone. Core exports its test helpers at `@tailory/core/testing/support`.
- 69e7c19: Add the applications model, resolving an application against the profile, and page fit to core; bullets now carry stable ids.
