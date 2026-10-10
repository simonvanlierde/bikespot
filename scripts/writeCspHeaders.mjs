// Fill the CSP script hash placeholder in dist/_headers from the inline
// script(s) actually shipped in dist/index.html, so the hash can't drift.
// Runs after `vite build`; fails loudly if the placeholder is gone.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const DIST = join(process.cwd(), "dist");
const PLACEHOLDER = "__INLINE_SCRIPT_HASHES__";

const html = readFileSync(join(DIST, "index.html"), "utf8");
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, body]) => body)
  .filter((body) => body.trim().length > 0)
  .map((body) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`);

const headersPath = join(DIST, "_headers");
const headers = readFileSync(headersPath, "utf8");
if (!headers.includes(PLACEHOLDER)) {
  throw new Error(`${PLACEHOLDER} not found in public/_headers`);
}
writeFileSync(headersPath, headers.replaceAll(PLACEHOLDER, hashes.join(" ")));
process.stdout.write(`CSP: hashed ${hashes.length} inline script(s) into dist/_headers\n`);
