import { useNavigate } from "@solidjs/router";
import { onSettled } from "solid-js";

/**
 * The old Connect an agent page moved to Settings › Agents. The server answers /connect with a
 * redirect (src/middleware.ts); this covers a link followed inside the app.
 */
export default function ConnectRedirect() {
  const navigate = useNavigate();
  onSettled(() => navigate("/settings/agents", { replace: true }));
  return null;
}
