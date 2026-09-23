import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  ContractError,
  renderMarkdown,
  renderTypeScript,
  resolveVersion,
  validateSource,
} from "../scripts/contract-source.js";
import { EVENT_LISTS, TAXONOMY_VERSION } from "../src/contract.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const raw = (): Record<string, unknown> =>
  JSON.parse(readFileSync(`${root}contract/events.json`, "utf8")) as Record<
    string,
    unknown
  >;
const source = validateSource(raw());

function problemsFor(
  mutate: (json: Record<string, unknown>) => void,
): string[] {
  const json = raw();
  mutate(json);
  try {
    validateSource(json);
  } catch (error) {
    if (error instanceof ContractError) return error.problems;
    throw error;
  }
  return [];
}

// Walks the parsed file by path, for tests that break one thing in it.
function at(json: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (node as Record<string | number, unknown>)[key],
    json,
  );
}
function set(json: unknown, path: (string | number)[], value: unknown): void {
  const parent = at(json, path.slice(0, -1)) as Record<
    string | number,
    unknown
  >;
  parent[path[path.length - 1] as string | number] = value;
}
function push(json: unknown, path: (string | number)[], value: unknown): void {
  (at(json, path) as unknown[]).push(value);
}

describe("the source file", () => {
  it("is valid", () => {
    expect(() => validateSource(raw())).not.toThrow();
  });

  it("names an unknown property type", () => {
    const problems = problemsFor((j) => {
      set(j, ["events", 0, "properties", 0, "type"], "date");
    });
    expect(problems).toContainEqual(
      expect.stringContaining('event cta_clicked.cta_id: unknown type "date"'),
    );
  });

  it("names a duplicate event", () => {
    const problems = problemsFor((j) => {
      push(j, ["events"], at(j, ["events", 0]));
    });
    expect(problems).toContainEqual("event cta_clicked: duplicate event");
  });

  it("names a gap in the versions", () => {
    const problems = problemsFor((j) => {
      set(j, ["versions", 1, "version"], 3);
    });
    expect(problems).toContainEqual(
      expect.stringContaining("versions[1]: expected version 2"),
    );
  });

  it("refuses a required property added after its event", () => {
    const problems = problemsFor((j) => {
      push(j, ["versions"], { version: 3, date: "2026-10-01", change: "test" });
      push(j, ["events", 0, "properties"], {
        name: "late",
        since: 3,
        type: "string",
        required: true,
      });
    });
    expect(problems).toContainEqual(
      expect.stringContaining(
        "event cta_clicked.late: a property added after its event must be optional",
      ),
    );
  });

  it("names a dashboard series on an unknown event", () => {
    const problems = problemsFor((j) => {
      set(j, ["dashboard", "insights", 0, "series", 0, "event"], "nope");
    });
    expect(problems).toContainEqual(
      expect.stringContaining("unknown event nope"),
    );
  });

  it("reports every problem at once", () => {
    const problems = problemsFor((j) => {
      set(j, ["events", 0, "stage"], "wonder");
      set(j, ["events", 1, "origin"], "edge");
    });
    expect(problems).toHaveLength(2);
  });
});

describe("published versions", () => {
  const frozen = readdirSync(`${root}contract/published`)
    .map((file) => /^v(\d+)\.json$/.exec(file)?.[1])
    .filter((v): v is string => v !== undefined)
    .map(Number)
    .sort((a, b) => a - b);

  it("every version in the source is frozen", () => {
    expect(frozen).toEqual(source.versions.map((v) => v.version));
  });

  it.each(frozen)("v%i still resolves exactly to its snapshot", (version) => {
    const snapshot = JSON.parse(
      readFileSync(`${root}contract/published/v${version}.json`, "utf8"),
    ) as unknown;
    expect(resolveVersion(source, version)).toEqual(snapshot);
  });

  it("a renamed event breaks the snapshot", () => {
    const json = raw();
    // video_played, because no dashboard insight reads it: the validator would
    // otherwise reject the rename first, which is also correct but not this test.
    set(json, ["events", 5, "name"], "video_started");
    const snapshot = JSON.parse(
      readFileSync(`${root}contract/published/v1.json`, "utf8"),
    ) as unknown;
    expect(resolveVersion(validateSource(json), 1)).not.toEqual(snapshot);
  });
});

describe("generated files", () => {
  it("src/generated/contract.ts is current", () => {
    expect(readFileSync(`${root}src/generated/contract.ts`, "utf8")).toBe(
      renderTypeScript(source),
    );
  });

  it("docs/events.md is current", () => {
    expect(readFileSync(`${root}docs/events.md`, "utf8")).toBe(
      renderMarkdown(source),
    );
  });

  it("the contract export matches the source", () => {
    expect(TAXONOMY_VERSION).toBe(String(source.versions.length));
    expect(EVENT_LISTS[1].map((e) => e.name)).toContain("video_played");
    expect(EVENT_LISTS[1].map((e) => e.name)).not.toContain("consent_updated");
    expect(EVENT_LISTS[2].map((e) => e.name)).toContain("consent_updated");
  });
});

describe("the /contract entry point", () => {
  it("loads neither PostHog library", async () => {
    const loaded: string[] = [];
    vi.resetModules();
    vi.doMock("posthog-js", () => {
      loaded.push("posthog-js");
      return {};
    });
    vi.doMock("posthog-node", () => {
      loaded.push("posthog-node");
      return {};
    });
    const contract = await import("../src/contract.js");
    expect(contract.BASELINE_DASHBOARDS[2].length).toBeGreaterThan(0);
    expect(loaded).toEqual([]);
  });

  it("knows its versions", async () => {
    const { eventsFor, isKnownVersion } = await import("../src/contract.js");
    expect(isKnownVersion(1)).toBe(true);
    expect(isKnownVersion(9)).toBe(false);
    expect(eventsFor(9)).toBeUndefined();
    expect(eventsFor(2)?.some((e) => e.name === "consent_updated")).toBe(true);
  });
});
