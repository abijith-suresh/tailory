import "./styles/index.css";

import { Link, Meta, Title } from "@solidjs/meta";
import { createRouter, useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, Loading, lazy } from "solid-js";

import { AppHeader } from "./components/AppHeader";
import { Toaster } from "./components/Toaster";
import { clearToasts } from "./lib/toast";
import Application from "./routes/Application";
import ConnectRedirect from "./routes/ConnectRedirect";
import Consent from "./routes/Consent";
import Home from "./routes/Home";
import NotFound from "./routes/NotFound";
import Profile from "./routes/Profile";
import Settings from "./routes/Settings";
import SignIn from "./routes/SignIn";
import { getViewer } from "./server/functions";

const Router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/applications/:id", component: Application },
    { path: "/profile", component: Profile },
    { path: "/connect", component: ConnectRedirect },
    {
      path: "/settings/:page?",
      component: Settings,
      matchFilters: { page: ["general", "agents", "data", "account"] },
    },
    { path: "/sign-in", component: SignIn },
    { path: "/oauth/consent", component: Consent },
    // Design review page for the shared components; left out of production builds.
    ...(import.meta.env.DEV
      ? [{ path: "/dev/components", component: lazy(() => import("./routes/Components")) }]
      : []),
    { path: "*404", component: NotFound },
  ],
});

/** Pages without the navigation: signed-out sign-in, and the OAuth consent step. */
const BARE_PATHS = new Set(["/sign-in", "/oauth/consent"]);

/**
 * The frame around every page. Pages swap at once, with no transition between them: a toast or
 * an open menu belongs to the page it came from and goes with it.
 */
function Shell(props: { children?: JSX.Element }) {
  const location = useLocation();
  const bare = () => BARE_PATHS.has(location.pathname);
  // Signed-out people reach only the bare pages, so those never ask who is signed in.
  const viewer = createMemo(() => (bare() ? undefined : getViewer()));

  createEffect(
    () => location.pathname,
    (_pathname, previous) => {
      if (previous !== undefined) clearToasts();
    }
  );

  return (
    <>
      <Title>Tailory</Title>
      <Meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f3ef" />
      <Meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141518" />
      <Link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      {/* The router takes in-page links over, so the skip link moves focus itself. */}
      {/* biome-ignore lint/a11y/useValidAnchor: a real in-page link; the click only adds focus */}
      <a
        class="skip-link"
        href="#main"
        aria-current="false"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <Loading fallback={<AppHeader pathname={location.pathname} bare={bare()} />}>
        <AppHeader pathname={location.pathname} bare={bare()} viewer={viewer()} />
      </Loading>
      <main id="main" class="app-main page-x" tabindex="-1">
        {props.children}
      </main>
      <Toaster />
    </>
  );
}

export default function App() {
  return <Router>{(props) => <Shell>{props.children}</Shell>}</Router>;
}
