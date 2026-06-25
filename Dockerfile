# syntax=docker/dockerfile:1

# --- Build stage: compile the static PWA ---
FROM node:24-alpine AS build
WORKDIR /app

# Use the pnpm version pinned in package.json via Corepack.
RUN corepack enable

# Install dependencies against the lockfile for reproducible builds.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Runtime stage: serve dist/ with Caddy ---
FROM caddy:alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
