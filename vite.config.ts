import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 235,
  },
  resolve: {
    // Code written for React imports react and react-dom; preact/compat answers.
    // `react` comes first on purpose: it also catches react/jsx-runtime, so the
    // JSX runtime loads preact/compat and its React prop handling (onChange on a
    // text field fires per keystroke). Reordering drops that, and changes behaviour.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom/client": "preact/compat/client",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Bikespot",
        short_name: "Bikespot",
        description: "Save and reopen the bike spot you last used.",
        start_url: "/",
        display: "standalone",
        theme_color: "#1d3d91",
        background_color: "#f2f4f7",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        globPatterns: ["**/*.{html,js,css,png,svg,webmanifest,woff2}"],
        runtimeCaching: [],
      },
    }),
  ],
});
