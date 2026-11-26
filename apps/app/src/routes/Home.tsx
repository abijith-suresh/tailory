import { Title } from "@solidjs/meta";

import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

// The applications list comes with the MCP tools. Until then this is the empty home screen.
export default function Home() {
  return (
    <>
      <Title>Applications · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Applications</h1>
          <p class="page-lede">Each application is your resume cut for one job.</p>
        </div>
      </div>
      <EmptyState
        title="No applications yet"
        actions={
          <LinkButton variant="primary" href="/connect">
            Connect an agent
          </LinkButton>
        }
      >
        <p>
          Ask your agent to tailor your resume for a job and the application shows up here, with its
          status and the resume it will send.
        </p>
      </EmptyState>
    </>
  );
}
