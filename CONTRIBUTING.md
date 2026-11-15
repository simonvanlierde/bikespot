# Contributing

Thanks for your interest in Bikespot. Issues and pull requests are welcome.

## Prerequisites

- Node.js 26 (pinned in [`.node-version`](.node-version))
- [pnpm 12.13.0](https://pnpm.io/installation), as pinned in `package.json`
- [just](https://just.systems), which runs the same checks as CI

## Workflow

```bash
pnpm install
pnpm test:setup        # once: the headless Chromium the photo and e2e tests run in
pnpm exec prek install # git hooks: biome and tsc before a commit, the tests before a push
pnpm dev               # start the dev server
just check             # lint, unused code, types, tests, build, bundle budget, audit, licences
just ts-e2e            # accessibility, CSP, reflow and persistence specs against the production build
```

`just check` and `just ts-e2e` must pass before opening a PR. `just` lists the other recipes.

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`).
- Keep each change to one topic.
- A change that alters behaviour comes with tests, and a bug fix with a test that fails without it.
  Unit and component tests sit in `tests/*.test.ts(x)` (Vitest, `pnpm test`; `pnpm coverage` shows what they miss).
  Browser specs sit in `tests/e2e/` (Playwright, `pnpm test:e2e`).
- Coding standards: [Biome](https://biomejs.dev) formats and lints (`pnpm fix` applies its fixes), [knip](https://knip.dev)
  flags unused code, and `tsc` checks types. `pnpm check` and `pnpm typecheck` must pass.
- By taking part you agree to the [code of conduct](.github/CODE_OF_CONDUCT.md).
