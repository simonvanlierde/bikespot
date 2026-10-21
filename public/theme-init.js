// Applies a forced light/dark choice before first paint to avoid a flash. A file,
// not an inline script, so the page runs under script-src 'self'. Kept in sync
// with src/lib/theme.ts (same key, same attribute).
try {
  const t = localStorage.getItem("bikespot-theme");
  if (t === "light" || t === "dark") {
    document.documentElement.dataset.theme = t;
  }
  // biome-ignore lint/suspicious/noEmptyBlockStatements: no storage access is a fine reason to skip the theme override
} catch {}
