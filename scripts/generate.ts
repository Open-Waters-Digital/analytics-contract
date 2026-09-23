/**
 * Writes src/generated/contract.ts and docs/events.md from contract/events.json.
 *
 * With --check it writes nothing: it renders to memory and fails, naming each
 * stale file, if a committed file differs from what the source produces. CI
 * runs the check, so a generated file cannot drift from the contract.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ContractError,
  renderMarkdown,
  renderTypeScript,
  validateSource,
} from "./contract-source.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const at = (path: string) => `${root}${path}`;

export const OUTPUTS = {
  "src/generated/contract.ts": renderTypeScript,
  "docs/events.md": renderMarkdown,
} as const;

function main(): number {
  const check = process.argv.includes("--check");
  let source;
  try {
    source = validateSource(
      JSON.parse(readFileSync(at("contract/events.json"), "utf8")),
    );
  } catch (error) {
    console.error(error instanceof ContractError ? error.message : error);
    return 1;
  }

  const stale: string[] = [];
  for (const [path, render] of Object.entries(OUTPUTS)) {
    const wanted = render(source);
    if (check) {
      let committed = "";
      try {
        committed = readFileSync(at(path), "utf8");
      } catch {
        // Missing counts as stale.
      }
      if (committed !== wanted) stale.push(path);
    } else {
      writeFileSync(at(path), wanted);
      console.log(`wrote ${path}`);
    }
  }

  if (stale.length > 0) {
    console.error(
      `Generated files are stale; run \`pnpm run generate\` and commit:\n  - ${stale.join("\n  - ")}`,
    );
    return 1;
  }
  if (check) console.log("generated files are current");
  return 0;
}

process.exitCode = main();
