import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { createMemo, Loading, Match, Show, Switch } from "solid-js";

import { SideNav } from "../components/SideNav";
import { getViewer } from "../server/functions";
import NotFound from "./NotFound";
import Account from "./settings/Account";
import Agents from "./settings/Agents";
import Data from "./settings/Data";
import General from "./settings/General";

const PAGES = [
  { id: "general", label: "General" },
  { id: "agents", label: "Agents" },
  { id: "data", label: "Data" },
  // Local mode has no sign-in, so no account to manage.
  { id: "account", label: "Account", serverOnly: true },
] as const;

/** Settings: General, Agents, Data, and Account in server mode. /settings opens General. */
export default function Settings() {
  const params = useParams<{ page?: string }>();
  const viewer = createMemo(() => getViewer());
  const page = () => params.page ?? "general";
  const pages = () => PAGES.filter((item) => !("serverOnly" in item) || viewer().mode === "server");
  const current = () => pages().find((item) => item.id === page());

  return (
    <Loading fallback={<p class="loading-note">Loading…</p>}>
      <Show when={current()} fallback={<NotFound />}>
        {(item) => (
          <>
            <Title>{`${item().label} · Settings · Tailory`}</Title>
            <div class="settings">
              <div class="settings__nav">
                <h1 class="settings__heading">Settings</h1>
                <SideNav
                  label="Settings"
                  current={`/settings/${item().id}`}
                  items={pages().map(({ id, label }) => ({ href: `/settings/${id}`, label }))}
                />
              </div>
              <div class="settings__pane">
                <Switch>
                  <Match when={item().id === "general"}>
                    <General />
                  </Match>
                  <Match when={item().id === "agents"}>
                    <Agents />
                  </Match>
                  <Match when={item().id === "data"}>
                    <Data />
                  </Match>
                  <Match when={item().id === "account"}>
                    <Account name={viewer().name} email={viewer().email} />
                  </Match>
                </Switch>
              </div>
            </div>
          </>
        )}
      </Show>
    </Loading>
  );
}
