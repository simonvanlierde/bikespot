import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 235,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom/client': 'preact/compat/client',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
    },
  },
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/apple-touch-icon.png'],
    manifest: {
      name: 'Bikespot',
      short_name: 'Bikespot',
      description: 'Save and reopen the bike spot you last used.',
      start_url: '/',
      display: 'standalone',
      theme_color: '#15231d',
      background_color: '#f4f3ef',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'],
      runtimeCaching: [],
    },
  }), cloudflare()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
});