import "./styles/app.css";

import { Link, Meta, Title } from "@solidjs/meta";
import { createRouter, useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, Loading, lazy } from "solid-js";

import { AppHeader } from "./components/AppHeader";
import Connect from "./routes/Connect";
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
    { path: "/profile", component: Profile },
    { path: "/connect", component: Connect },
    { path: "/settings", component: Settings },
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

function Shell(props: { children?: JSX.Element }) {
  const location = useLocation();
  const bare = () => BARE_PATHS.has(location.pathname);
  // Signed-out people reach only the bare pages, so those never ask who is signed in.
  const viewer = createMemo(() => (bare() ? undefined : getViewer()));

  return (
    <>
      <Title>Tailory</Title>
      <Meta name="theme-color" content="#f4f3ef" />
      <Link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <a class="skip-link" href="#main" aria-current="false">
        Skip to content
      </a>
      <Loading fallback={<AppHeader pathname={location.pathname} bare={bare()} />}>
        <AppHeader pathname={location.pathname} bare={bare()} viewer={viewer()} />
      </Loading>
      <main id="main" class="app-main page-x" tabindex="-1">
        {props.children}
      </main>
    </>
  );
}

export default function App() {
  return <Router>{(props) => <Shell>{props.children}</Shell>}</Router>;
}
