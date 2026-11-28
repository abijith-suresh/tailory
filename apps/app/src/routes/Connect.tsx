import { Title } from "@solidjs/meta";
import { createMemo, Loading } from "solid-js";

import { ConnectGuide } from "../components/ConnectGuide";
import { getConnectInfo } from "../server/connect-functions";

export default function Connect() {
  const info = createMemo(() => getConnectInfo());
  return (
    <>
      <Title>Connect an agent · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Connect an agent</h1>
          <p class="page-lede">
            Your agent works in Tailory through MCP. Connect it once, then ask it to set up your
            profile and tailor your resume for each job.
          </p>
        </div>
      </div>
      <Loading fallback={<p class="loading-note">Loading…</p>}>
        <ConnectGuide info={info()} />
      </Loading>
    </>
  );
}
