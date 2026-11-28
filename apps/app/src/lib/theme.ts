/**
 * The colour theme: follow the system, or pin light or dark. The choice is kept in this browser's
 * localStorage and set as `data-theme` on <html>, which src/styles/tokens.css reads.
 */
export type Theme = "system" | "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];

export const THEME_KEY = "tailory-theme";

const isTheme = (value: unknown): value is Theme =>
  typeof value === "string" && (THEMES as readonly string[]).includes(value);

/** The saved theme, or "system" when there is none or storage is blocked. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

/** Applies a theme to the page and saves it. */
export function setTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme holds until the page reloads.
  }
}

/**
 * Runs in <head> before the first paint, so a pinned theme never flashes the other one. Kept
 * tiny and dependency-free; it reads the same key as readTheme.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
