import process from "node:process";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// jsdom touches Node 26's experimental localStorage when it builds each test
// window, which warns unless --localstorage-file is set. We shim localStorage in
// tests/setup.ts instead, so silence that one warning; test workers inherit this.
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --disable-warning=ExperimentalWarning`;

// Unit and browser tests only: Playwright runs tests/e2e/ against the built app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      testTimeout: 30000,
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "jsdom",
            setupFiles: "./tests/setup.ts",
            include: ["tests/**/*.test.{ts,tsx}"],
            exclude: ["tests/**/*.browser.test.ts"],
          },
        },
        {
          // Real Chromium, for code that needs a real canvas and image decoder.
          extends: true,
          test: {
            name: "browser",
            include: ["tests/**/*.browser.test.ts"],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
          },
        },
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.d.ts", "src/main.tsx"],
      },
    },
  }),
);
