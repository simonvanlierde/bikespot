// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function scratch() {
  const directory = mkdtempSync(join(tmpdir(), "bikespot-deployment-"));
  directories.push(directory);
  return directory;
}

function fake(directory: string, name: string, script: string) {
  writeFileSync(join(directory, name), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
}

describe("production revision gate", () => {
  it.each([
    ["echo reviewed-head", true, 0],
    ["echo newer-head", false, 0],
    ["exit 7", false, 7],
  ])("deploys only the current checked revision when lookup is %s", (lookup, deployed, status) => {
    const directory = scratch();
    fake(directory, "gh", lookup);
    const scripts = join(directory, ".github/scripts");
    mkdirSync(scripts, { recursive: true });
    fake(scripts, "deploy-worker.sh", "echo deployed");
    const workflow = readFileSync(".github/workflows/ts.yml", "utf8");
    const script = workflow
      .split("        id: deploy\n")[1]!
      .split(/ {8}run: \|[-+]?\n/)[1]!
      .replace(/^ {10}/gm, "");
    const result = spawnSync("bash", ["-e", "-c", script], {
      cwd: directory,
      encoding: "utf8",
      env: {
        PATH: `${directory}:/usr/bin:/bin`,
        GITHUB_WORKSPACE: directory,
        EXPECTED_SHA: "reviewed-head",
        REPO: "example/bikespot",
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
    expect(result.stdout.includes("deployed")).toBe(deployed);
  });
});

describe("Worker deployment", () => {
  it.each([
    ["echo https://bikespot.example.workers.dev", 0],
    ["echo https://bikespot.example.workers.dev; exit 7", 7],
    ["echo 'No deployment address'", 1],
  ])("keeps the deployment result for %s", (script, status) => {
    const directory = scratch();
    fake(directory, "wrangler", script);
    const result = spawnSync("bash", [resolve(".github/scripts/deploy-worker.sh"), "Preview", "bikespot-pr-12"], {
      cwd: directory,
      encoding: "utf8",
      env: {
        PATH: `${directory}:/usr/bin:/bin`,
        WRANGLER: "wrangler",
        GITHUB_OUTPUT: join(directory, "output"),
        GITHUB_STEP_SUMMARY: join(directory, "summary"),
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
    const output = join(directory, "output");
    expect(existsSync(output) ? readFileSync(output, "utf8") : "").toBe(
      status === 0 ? "url=https://bikespot.example.workers.dev\n" : "",
    );
  });
});

describe("preview retirement", () => {
  it.each([
    ["echo 'open false'", 0],
    ["exit 1", 1],
  ])("keeps the Worker when the PR lookup is %s", (lookup, status) => {
    const directory = scratch();
    fake(directory, "gh", lookup);
    // Any call after listing would attempt a deletion or address probe.
    fake(directory, "curl", 'case "$*" in *scripts) echo \'{"result":[{"id":"bikespot-pr-12"}]}\';; *) exit 99;; esac');
    const result = spawnSync("bash", [resolve(".github/scripts/preview-retire.sh")], {
      cwd: directory,
      encoding: "utf8",
      env: {
        PATH: `${directory}:/usr/bin:/bin`,
        CLOUDFLARE_API_TOKEN: "test-token",
        CLOUDFLARE_ACCOUNT_ID: "test-account",
        REPO: "example/bikespot",
        SLUG: "bikespot",
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
    expect(result.stdout).toContain("Nothing to retire.");
    expect(result.stdout).not.toContain("Deleted");
  });
});
