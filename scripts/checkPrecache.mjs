// Post-build guard: every font the app ships, and every file the built CSS
// loads, must be in the service worker's precache. Anything missing there
// fails to load offline, which is where people read their spot back.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const DIST = join(import.meta.dirname, "..", "dist");
const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;
const files = readdirSync(DIST, { recursive: true }).map((file) => file.replaceAll("\\", "/"));
const precached = new Set(
  [...readFileSync(join(DIST, "sw.js"), "utf8").matchAll(/\burl:"([^"]+)"/g)].map(([, url]) => url),
);

const fonts = files.filter((file) => FONT_FILE.test(file));
const cssUrls = files
  .filter((file) => file.endsWith(".css"))
  .flatMap((css) =>
    [...readFileSync(join(DIST, css), "utf8").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)]
      .map(([, url]) => url)
      .filter((url) => !url.startsWith("data:"))
      .map((url) => relative(DIST, url.startsWith("/") ? join(DIST, url) : join(DIST, css, "..", url)))
      .map((file) => file.replaceAll("\\", "/")),
  );

if (fonts.length === 0) {
  throw new Error("dist has no font files; the check would pass on nothing");
}

const missing = [...new Set([...fonts, ...cssUrls])].filter((file) => !precached.has(file));

if (missing.length > 0) {
  throw new Error(`dist/sw.js does not precache: ${missing.join(", ")}`);
}
process.stdout.write(`Precache: all ${fonts.length} font file(s) and CSS assets are in dist/sw.js\n`);
