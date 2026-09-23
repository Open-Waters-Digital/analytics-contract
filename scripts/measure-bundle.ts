/**
 * Builds a minimal consumer of `/browser` the way a site's bundler would, with
 * code splitting, and checks two things about the page's initial JavaScript:
 * that it contains no posthog-js code (PostHog must only arrive through the
 * dynamic import, after idle), and how many bytes the package adds, gzipped.
 *
 * Runs against dist/, so it measures what consumers install. Part of
 * `ci:quality`, after the build.
 */
import { build } from "esbuild";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = mkdtempSync(join(tmpdir(), "ow-consumer-"));

await build({
  entryPoints: { main: `${root}test/fixtures/consumer/main.ts` },
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  outdir: out,
  logLevel: "error",
});

const entry = readFileSync(join(out, "main.js"), "utf8");
const chunks = readdirSync(out).filter((f) => f !== "main.js");
const lazy = chunks.map((f) => readFileSync(join(out, f), "utf8")).join("");

// Strings posthog-js carries and this package does not.
const POSTHOG_MARKERS = ["$pageview", "posthog-js/", "persistence_name"];
const leaked = POSTHOG_MARKERS.filter((m) => entry.includes(m));
const loadedLazily = POSTHOG_MARKERS.some((m) => lazy.includes(m));

const eager = gzipSync(entry).length;
const posthog = gzipSync(lazy).length;
console.log(`eager /browser entry: ${eager} bytes gzipped`);
console.log(
  `posthog-js chunk(s), fetched after idle: ${posthog} bytes gzipped`,
);

if (leaked.length > 0) {
  console.error(
    `posthog-js code is in the eager bundle (found ${leaked.join(", ")})`,
  );
  process.exitCode = 1;
} else if (!loadedLazily) {
  console.error(
    "posthog-js was not found in a lazy chunk; the check itself is broken",
  );
  process.exitCode = 1;
}
