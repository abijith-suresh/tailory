import { describe, expect, it } from "vitest";

import { ConnectGuide, EXAMPLE_PROMPTS } from "./ConnectGuide";
import { renderHtml } from "./render.testing";

const local = { mode: "local", mcpUrl: "http://127.0.0.1:4413/mcp" } as const;
const hosted = { mode: "server", mcpUrl: "https://tailory.example.com/mcp" } as const;

const render = (info: typeof local | typeof hosted) =>
  renderHtml(() => <ConnectGuide info={info} />);

const client = (doc: Document, id: string) =>
  doc.querySelector(`[aria-labelledby="client-${id}"]`)?.textContent ?? "";

describe("ConnectGuide", () => {
  it("shows this server's MCP address, ready to copy", () => {
    const doc = render(local);
    expect(doc.querySelector(".address__url")?.textContent).toBe(local.mcpUrl);
    expect(doc.querySelector('[aria-label="Copy the MCP address"]')).not.toBeNull();
  });

  it("puts the address in every client's setup", () => {
    for (const info of [local, hosted]) {
      const doc = render(info);
      expect(client(doc, "claude-code")).toContain(
        `claude mcp add --transport http tailory ${info.mcpUrl}`
      );
      expect(client(doc, "codex")).toContain(`url = "${info.mcpUrl}"`);
      expect(client(doc, "cursor")).toContain(`"url": "${info.mcpUrl}"`);
      expect(client(doc, "vscode")).toContain(`"url": "${info.mcpUrl}"`);
    }
  });

  it("says in local mode that the web clients can't reach it, and has no sign-in steps", () => {
    const doc = render(local);
    expect(client(doc, "claude-ai")).toContain("can't reach Tailory on your computer");
    expect(client(doc, "chatgpt")).toContain("can't reach Tailory on your computer");
    expect(client(doc, "claude-ai")).not.toContain("Add custom connector");
    expect(doc.body.textContent).not.toContain("codex mcp login");
  });

  it("gives the custom connector steps and sign-in in server mode", () => {
    const doc = render(hosted);
    expect(client(doc, "claude-ai")).toContain("Add custom connector");
    expect(client(doc, "chatgpt")).toContain("Add custom MCP server");
    expect(client(doc, "codex")).toContain("codex mcp login tailory");
    expect(client(doc, "claude-code")).toContain("/mcp");
  });

  it("names the one MCP revision it speaks, and offers prompts to try", () => {
    const doc = render(local);
    expect(doc.body.textContent).toContain("MCP revision 2026-07-28 only");
    for (const prompt of EXAMPLE_PROMPTS) expect(doc.body.textContent).toContain(prompt);
  });
});
