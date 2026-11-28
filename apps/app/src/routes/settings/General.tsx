import { createSignal, onSettled } from "solid-js";

import { Segmented } from "../../components/Segmented";
import { readTheme, setTheme, type Theme } from "../../lib/theme";

const OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function General() {
  // The saved theme lives in this browser, so the server renders System and the page corrects it.
  const [theme, choose] = createSignal<Theme>("system");
  onSettled(() => {
    choose(readTheme());
  });

  return (
    <>
      <h2 class="settings__title">General</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div class="settings-row__text">
            <span class="settings-row__name" id="theme-label">
              Theme
            </span>
          </div>
          <Segmented
            label="Theme"
            options={OPTIONS}
            value={theme()}
            onChange={(value) => {
              choose(value);
              setTheme(value);
            }}
          />
        </div>
      </div>
    </>
  );
}
