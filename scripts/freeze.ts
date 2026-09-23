/**
 * Freezes a taxonomy version: writes contract/published/v<N>.json from the
 * source, once. It refuses to overwrite, because a published version is what
 * sites already send; the snapshot test compares the source against it.
 *
 *   pnpm run freeze 3
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resolveVersion, validateSource } from "./contract-source.js";

const root = fileURLToPath(new URL("..", import.meta.url));

function main(): number {
  const version = Number(process.argv[2]);
  const source = validateSource(
    JSON.parse(readFileSync(`${root}contract/events.json`, "utf8")),
  );
  if (
    !Number.isInteger(version) ||
    version < 1 ||
    version > source.versions.length
  ) {
    console.error(
      `Usage: pnpm run freeze <version>, from 1 to ${source.versions.length}`,
    );
    return 1;
  }
  const path = `${root}contract/published/v${version}.json`;
  if (existsSync(path)) {
    console.error(
      `v${version} is already frozen. A published version is never edited.`,
    );
    return 1;
  }
  writeFileSync(
    path,
    JSON.stringify(resolveVersion(source, version), null, 2) + "\n",
  );
  console.log(`froze contract/published/v${version}.json`);
  return 0;
}

process.exitCode = main();
