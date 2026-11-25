import { Title } from "@solidjs/meta";
import { createRouter } from "@solidjs/router";

import Consent from "./routes/Consent";
import Home from "./routes/Home";
import NotFound from "./routes/NotFound";
import Settings from "./routes/Settings";
import SignIn from "./routes/SignIn";

// Placeholder screens. The real ones come with their own design review.
const Router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/sign-in", component: SignIn },
    { path: "/oauth/consent", component: Consent },
    { path: "/settings", component: Settings },
    { path: "*404", component: NotFound },
  ],
});

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>Tailory</Title>
          <main>{props.children}</main>
        </>
      )}
    </Router>
  );
}
