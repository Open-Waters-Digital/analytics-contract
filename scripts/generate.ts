/**
 * Writes src/generated/contract.ts, src/generated/channels.ts and
 * docs/events.md from contract/events.json and contract/channels.json.
 *
 * With --check it writes nothing: it renders to memory and fails, naming each
 * stale file, if a committed file differs from what the sources produce. CI
 * runs the check, so a generated file cannot drift from the contract.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ContractError,
  renderChannels,
  renderMarkdown,
  renderTypeScript,
  validateChannels,
  validateSource,
  type ChannelSource,
  type ContractSource,
} from "./contract-source.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const at = (path: string) => `${root}${path}`;

interface Sources {
  source: ContractSource;
  channels: ChannelSource;
}

export const OUTPUTS: Record<string, (sources: Sources) => string> = {
  "src/generated/contract.ts": ({ source }) => renderTypeScript(source),
  "src/generated/channels.ts": ({ channels }) => renderChannels(channels),
  "docs/events.md": ({ source }) => renderMarkdown(source),
};

function main(): number {
  const check = process.argv.includes("--check");
  let sources: Sources;
  try {
    sources = {
      source: validateSource(
        JSON.parse(readFileSync(at("contract/events.json"), "utf8")),
      ),
      channels: validateChannels(
        JSON.parse(readFileSync(at("contract/channels.json"), "utf8")),
      ),
    };
  } catch (error) {
    console.error(error instanceof ContractError ? error.message : error);
    return 1;
  }

  const stale: string[] = [];
  for (const [path, render] of Object.entries(OUTPUTS)) {
    const wanted = render(sources);
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
