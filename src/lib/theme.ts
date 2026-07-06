import { effect, signal } from "@preact/signals";

// 'system' follows the OS via prefers-color-scheme (the default); 'light'/'dark'
// force the palette regardless. Stored separately from app data so it applies at
// import time, before the async data load, avoiding a flash of the wrong theme.
export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];

const STORAGE_KEY = "bikespot-theme";

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage blocked (private mode, disabled cookies): fall back to system.
    return "system";
  }
}

export const theme = signal<Theme>(readStoredTheme());

// Reflect the choice onto <html data-theme> (base.css keys the forced palettes off
// it) and persist. 'system' clears both so the media query takes over again. Runs
// once on import, so the DOM is set before the first render.
effect(() => {
  const value = theme.value;
  const root = document.documentElement;

  if (value === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = value;
  }

  try {
    if (value === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Storage blocked: theme still applies for this session via data-theme above.
  }
});

export function setTheme(next: Theme): void {
  theme.value = next;
}
