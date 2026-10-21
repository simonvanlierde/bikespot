# Contributing

Thanks for your interest in Bikespot. Issues and pull requests are welcome.

## Prerequisites

- Node.js 26 (pinned in [`.node-version`](.node-version))
- pnpm (run `corepack enable` to use the version pinned in `package.json`)
- [just](https://just.systems), which runs the same checks as CI

## Workflow

```bash
pnpm install
pnpm test:setup        # once: the headless Chromium the photo and e2e tests run in
pnpm exec prek install # git hooks: biome and tsc before a commit, the tests before a push
pnpm dev               # start the dev server
just check             # lint, unused code, types, tests, build, bundle budget, audit
just ts-e2e            # accessibility, CSP and reflow checks against the production build
```

`just check` and `just ts-e2e` must pass before opening a PR. `just` lists the other recipes.

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`).
- Keep each change to one topic.
