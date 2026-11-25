---
"tailory": patch
---

Add sign-in and the MCP endpoint. Server mode signs people in with email and password, GitHub, or Google, whichever the environment enables, and refuses to start without one, a `TAILORY_AUTH_SECRET`, and a `TAILORY_PUBLIC_URL`. `/mcp` serves MCP 2026-07-28 to agents: through OAuth (Client ID Metadata Documents or Dynamic Client Registration) in server mode, and without sign-in on loopback in local mode. Settings can delete an account and everything it owns.
