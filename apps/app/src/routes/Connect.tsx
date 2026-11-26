import { Title } from "@solidjs/meta";

import { EmptyState } from "../components/EmptyState";

export default function Connect() {
  return (
    <>
      <Title>Connect an agent · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Connect an agent</h1>
          <p class="page-lede">
            Your agent works in Tailory through MCP. Connect it once and ask it to tailor your
            resume.
          </p>
        </div>
      </div>
      <EmptyState title="Setup steps are on their way">
        <p>
          This page will show this Tailory's MCP address and the setup for Claude, ChatGPT, Codex,
          Cursor and other clients, ready to copy.
        </p>
      </EmptyState>
    </>
  );
}
