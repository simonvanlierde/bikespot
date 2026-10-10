// Post-build guard for writeCspHeaders.mjs: the shipped CSP must carry the
// hash of every inline script in dist/index.html and no leftover placeholder.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const DIST = join(import.meta.dirname, "..", "dist");
const html = readFileSync(join(DIST, "index.html"), "utf8");
const csp = readFileSync(join(DIST, "_headers"), "utf8").match(
  /Content-Security-Policy: (.*)/,
)?.[1];

if (!csp || csp.includes("__")) {
  throw new Error(`dist/_headers has no filled-in CSP: ${csp}`);
}

const scriptSrc = csp.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].filter(
  ([, body]) => body.trim(),
);

if (inline.length === 0) {
  throw new Error("dist/index.html has no inline script, so script-src would allow none");
}

for (const [, body] of inline) {
  const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
  if (!scriptSrc.includes(hash)) {
    throw new Error(`script-src lacks ${hash} for an inline script in dist/index.html`);
  }
}
process.stdout.write(`CSP: ${inline.length} inline script hash(es) match dist/index.html\n`);
