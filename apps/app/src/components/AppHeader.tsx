import { For, Show } from "solid-js";

import { authClient } from "../lib/auth-client";
import { Menu } from "./Menu";
import { isCurrent, NAV_ITEMS } from "./nav";

export type Viewer = { name: string; email: string; mode: "local" | "server" };

type AppHeaderProps = {
  pathname: string;
  /** Who is signed in. Unknown while it loads, and on pages for signed-out people. */
  viewer?: Viewer;
  /** Sign-in and consent: the wordmark only, no navigation. */
  bare?: boolean;
};

// Links here always set aria-current. The router marks any link it finds unmarked whose address
// matches the page, which would make the wordmark "current" on the home screen.

function Wordmark() {
  return (
    <a class="app-header__brand" href="/" aria-label="Tailory, applications" aria-current="false">
      <svg viewBox="-1 0 22 22" aria-hidden="true">
        <path d="M1 2h18v5h-6v13H7V7H1z" />
      </svg>
      <span class="app-header__wordmark" translate="no">
        Tailory
      </span>
    </a>
  );
}

export const signOut = async () => {
  await authClient.signOut();
  window.location.assign("/sign-in");
};

/** Who is signed in, and Sign out. Server mode only: local mode has no accounts. */
function AccountMenu(props: { viewer: Viewer }) {
  const initial = () => props.viewer.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <Menu
      align="end"
      triggerClass="account-button"
      triggerLabel={`Account: ${props.viewer.name}`}
      trigger={
        <>
          <span class="account-button__initial" aria-hidden="true">
            {initial()}
          </span>
          <span class="account-button__name" aria-hidden="true">
            {props.viewer.name}
          </span>
        </>
      }
      header={
        <div class="account-menu__who">
          <span class="account-menu__name">{props.viewer.name}</span>
          <span class="account-menu__email">{props.viewer.email}</span>
        </div>
      }
      items={[{ label: "Sign out", onSelect: () => void signOut() }]}
    />
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <header class="app-header">
      <div class="app-header__bar page-x">
        <Wordmark />
        <Show when={!props.bare}>
          <nav class="app-nav" aria-label="Main">
            <ul class="app-nav__list">
              <For each={NAV_ITEMS}>
                {(item) => (
                  <li>
                    <a
                      class="app-nav__link"
                      href={item.href}
                      aria-current={isCurrent(item.href, props.pathname) ? "page" : "false"}
                    >
                      <span class="app-nav__long">{item.label}</span>
                      {/* Only one of the two shows, so the name is always the visible word. */}
                      <span class="app-nav__short">{item.short}</span>
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </nav>
          <Show when={props.viewer?.mode === "server" && props.viewer}>
            {(viewer) => (
              <div class="app-header__end">
                <AccountMenu viewer={viewer()} />
              </div>
            )}
          </Show>
        </Show>
      </div>
    </header>
  );
}
