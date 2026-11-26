import { For, Show } from "solid-js";

import { isCurrent, NAV_ITEMS } from "./nav";
import { SignOut } from "./SignOut";

export type Viewer = { name: string; email: string; mode: "local" | "server" };

type AppHeaderProps = {
  pathname: string;
  /** Who is signed in. Unknown while it loads, and on pages for signed-out people. */
  viewer?: Viewer;
  /** Sign-in and consent: the wordmark only, no navigation. */
  bare?: boolean;
};

const MENU_ID = "account-menu";

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

/** Account name and sign-out, in a popover. Server mode only: local mode has no accounts. */
function AccountMenu(props: { viewer: Viewer }) {
  const initial = () => props.viewer.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      <button
        type="button"
        class="account-button"
        popovertarget={MENU_ID}
        aria-label={`Account: ${props.viewer.name}`}
      >
        <span class="account-button__initial" aria-hidden="true">
          {initial()}
        </span>
        <span class="account-button__name" aria-hidden="true">
          {props.viewer.name}
        </span>
      </button>
      <div id={MENU_ID} class="account-menu" popover="auto">
        <div class="account-menu__who">
          <span class="account-menu__name">{props.viewer.name}</span>
          <span class="account-menu__email">{props.viewer.email}</span>
        </div>
        <SignOut />
      </div>
    </>
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
                      {item.label}
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </nav>
          <div class="app-header__account">
            <Show when={props.viewer}>
              {(viewer) => (
                <Show
                  when={viewer().mode === "server"}
                  fallback={
                    <span
                      class="mode-note"
                      title="No sign-in: Tailory only answers on this computer"
                    >
                      Local mode
                    </span>
                  }
                >
                  <AccountMenu viewer={viewer()} />
                </Show>
              )}
            </Show>
          </div>
        </Show>
      </div>
    </header>
  );
}
