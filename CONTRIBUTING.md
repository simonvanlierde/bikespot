# Contributing

Thanks for your interest in Bikespot. Issues and pull requests are welcome.

## Prerequisites

- Node.js 24 (pinned in [`.node-version`](.node-version))
- pnpm (run `corepack enable` to use the version pinned in `package.json`)

## Workflow

```bash
pnpm install
pnpm dev      # start the dev server
pnpm check    # lint, test, and build — must pass before opening a PR
```

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`).
- Keep changes focused; CI (lint, test, build) must be green.
