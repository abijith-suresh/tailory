import { Title } from "@solidjs/meta";
import { createRouter, defineRoutes } from "@solidjs/router";
import { lazy } from "solid-js";

const routes = defineRoutes([
  { path: "/", component: lazy(() => import("./routes/Home")) },
  { path: "/sign-in", component: lazy(() => import("./routes/SignIn")) },
  { path: "/consent", component: lazy(() => import("./routes/Consent")) },
]);

const Router = createRouter({ routes });

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>Tailory spike</Title>
          <main style={{ "font-family": "system-ui", padding: "2rem" }}>{props.children}</main>
        </>
      )}
    </Router>
  );
}
