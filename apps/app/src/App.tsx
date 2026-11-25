import { Title } from "@solidjs/meta";
import { createRouter } from "@solidjs/router";

import Home from "./routes/Home";
import NotFound from "./routes/NotFound";

// Placeholder screens. The real ones come with their own design review.
const Router = createRouter({
  routes: [
    { path: "/", component: Home },
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
