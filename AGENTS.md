# tailory — agent brief

Tailory is a browser-based resume editor: people import a PDF, DOCX, or JSON Resume-style file, edit structured data, preview it live, and export a text PDF or JSON. It is for people who want a private, no-account resume tool rather than another cloud profile.

## The Project

The name comes from the tailor. People adjust one resume for each job they apply to, the way a tailor cuts a suit for one person, and a whole career gets cut down to fit the role. Tailoring per job is where the product is heading (#176, #177).

Core promise: resume content stays in the browser. Import, editing, preview, export, autosave, and named drafts all happen locally, and content is never uploaded to an application server. Drafts live in IndexedDB and disappear with site data; public copy must say so.

Non-goals: accounts, signup, sync, or collaboration; server-side resume processing; an offline-first PWA or service worker; public sharing, design or page-format controls, or extra templates before that work is tracked and tested; ATS scoring or hiring guarantees; claims of full validation against the official JSON Resume schema; speculative code for possible future expansion.

Fitting the resume to a page count the user picks (#177) is automatic fitting, not a design control, so the design and page-format non-goal does not cover it. Never hard-code a page count. Users choose their target.

Status: live.

## Sources of Truth

| Fact                  | Where                            |
| --------------------- | -------------------------------- |
| Product intent        | § The Project (this file)        |
| Runtime behavior      | code + tests                     |
| Commands & deps       | `package.json`                   |
| Tool versions         | `mise.toml`                      |
| Commit rules          | `commitlint.config.ts`           |
| How to work here      | `CONTRIBUTING.md`                |
| User-visible behavior | `README.md`                      |
| JSON Resume contract  | `src/lib/resume/json.ts` + tests |

Code and tests are the authority; this file never overrides executable truth.
