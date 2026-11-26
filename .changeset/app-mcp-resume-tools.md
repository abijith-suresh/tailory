---
"tailory": patch
---

Add the resume tools to the MCP server, in place of `whoami`: `get_profile`, `update_profile`, `list_applications`, `create_application`, `get_application`, `tailor_application`, `update_application` and `export_resume`. Every write is logged as the agent and answers with the page result and the application's link. `export_resume` hands out a signed download link (`/download/<token>`) that works for an hour in any browser and opens only its own user's resume.
