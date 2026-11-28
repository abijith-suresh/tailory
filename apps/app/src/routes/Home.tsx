import { Title } from "@solidjs/meta";
import { createMemo, Loading, Show } from "solid-js";
import { LinkButton } from "../components/Button";
import { Board } from "../components/board/Board";
import { EmptyState } from "../components/EmptyState";
import { NewApplication } from "../components/NewApplication";
import { getBoard } from "../server/functions";

export default function Home() {
  const board = createMemo(() => getBoard());

  return (
    <>
      <Title>Applications · Tailory</Title>
      <Loading
        fallback={
          <>
            <div class="board-head">
              <h1 class="page-title">Applications</h1>
            </div>
            <p class="muted">Loading applications…</p>
          </>
        }
      >
        <Show
          when={board().rows.length > 0}
          fallback={
            <>
              <div class="page-head">
                <h1 class="page-title">Applications</h1>
                <NewApplication />
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
                  Ask your agent to tailor your resume for a job and the application shows up here,
                  with its status and the resume it will send.
                </p>
              </EmptyState>
            </>
          }
        >
          <Board rows={board().rows} />
        </Show>
      </Loading>
    </>
  );
}
