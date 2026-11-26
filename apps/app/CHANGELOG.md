# tailory

## 0.0.1

### Patch Changes

- 187d3b1: Store the profile, applications and a change log in the database, with a server-side data layer that keeps each user's rows apart, logs who made every write, and can undo a change.
- 5761348: Add the resume tools to the MCP server, in place of `whoami`: `get_profile`, `update_profile`, `list_applications`, `create_application`, `get_application`, `tailor_application`, `update_application` and `export_resume`. Every write is logged as the agent and answers with the page result and the application's link. `export_resume` hands out a signed download link (`/download/<token>`) that works for an hour in any browser and opens only its own user's resume.
- 84e0ba3: Fit, print and export resumes on the server. `src/server/render.ts` fits an application or the bare profile to its page target and says how it falls ("1 page, fits", "about 3 lines over 1 page"), prints the PDF with the same tightening, and exports JSON Resume. The server build bundles pdfmake and Roboto, so the installed package still depends on PGlite alone. Core exports its test helpers at `@tailory/core/testing/support`.
- 9cdb298: Add the app shell: a header with the Tailory wordmark, navigation for Applications, Profile, Connect an agent and Settings, and an account menu with sign-out in server mode. The sign-in, consent, settings and not-found pages use the site's fonts and colours, and Profile and Connect an agent have placeholder pages.
- ffeca7b: Add sign-in and the MCP endpoint. Server mode signs people in with email and password, GitHub, or Google, whichever the environment enables, and refuses to start without one, a `TAILORY_AUTH_SECRET`, and a `TAILORY_PUBLIC_URL`. `/mcp` serves MCP 2026-07-28 to agents: through OAuth (Client ID Metadata Documents or Dynamic Client Registration) in server mode, and without sign-in on loopback in local mode. Settings can delete an account and everything it owns.
