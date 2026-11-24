import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  ContractError,
  renderChannels,
  renderMarkdown,
  renderTypeScript,
  resolveDashboard,
  resolveVersion,
  validateChannels,
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

  it("names an enum value marked earlier than its property", () => {
    const problems = problemsFor((j) => {
      push(j, ["events", 1, "properties", 0, "type", "enum"], {
        value: "fax",
        since: 0,
      });
    });
    expect(problems).toContainEqual(
      expect.stringContaining('contact_link_clicked.channel value "fax"'),
    );
  });

  it("names an enum value older than its property", () => {
    const problems = problemsFor((j) => {
      const lead = (at(j, ["events"]) as { name: string }[]).findIndex(
        (e) => e.name === "lead_submitted",
      );
      // heard_about is since 3.
      push(j, ["events", lead, "properties", 7, "type", "enum"], {
        value: "radio",
        since: 2,
      });
    });
    expect(problems).toContainEqual(
      'event lead_submitted.heard_about value "radio": a value cannot be older than its property',
    );
  });

  it("names a duplicate between a plain and a versioned value", () => {
    const problems = problemsFor((j) => {
      push(j, ["events", 1, "properties", 0, "type", "enum"], {
        value: "email",
        since: 4,
      });
    });
    expect(problems).toContainEqual(
      expect.stringContaining("enum values must be unique"),
    );
  });

  it("refuses a value added later to a required property's enum", () => {
    const problems = problemsFor((j) => {
      push(j, ["events", 1, "properties", 0, "type", "enum"], {
        value: "fax",
        since: 4,
      });
    });
    expect(problems).toContainEqual(
      expect.stringContaining(
        "only an optional property's enum may gain values",
      ),
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

  it("a value added in a later version resolves without it at the earlier", () => {
    const json = raw();
    push(json, ["versions"], {
      version: 5,
      date: "2027-01-01",
      change: "test",
    });
    const lead = (at(json, ["events"]) as { name: string }[]).findIndex(
      (e) => e.name === "lead_submitted",
    );
    push(json, ["events", lead, "properties", 8, "type", "enum"], {
      value: "le_chat",
      since: 5,
    });
    const fixture = validateSource(json);
    const aiTool = (version: number) =>
      resolveVersion(fixture, version)
        .events.find((e) => e.name === "lead_submitted")
        ?.properties.find((p) => p.name === "ai_tool")?.type;
    expect(aiTool(4)).toEqual({
      kind: "enum",
      values: ["chatgpt", "claude", "gemini", "perplexity", "copilot", "other"],
    });
    expect(aiTool(5)).toEqual({
      kind: "enum",
      values: [
        "chatgpt",
        "claude",
        "gemini",
        "perplexity",
        "copilot",
        "other",
        "le_chat",
      ],
    });
  });

  it("a value added without its version breaks the snapshot", () => {
    const json = raw();
    const lead = (at(json, ["events"]) as { name: string }[]).findIndex(
      (e) => e.name === "lead_submitted",
    );
    push(json, ["events", lead, "properties", 7, "type", "enum"], "radio");
    const snapshot = JSON.parse(
      readFileSync(`${root}contract/published/v3.json`, "utf8"),
    ) as unknown;
    expect(resolveVersion(validateSource(json), 3)).not.toEqual(snapshot);
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

describe("taxonomy v4", () => {
  const lead = (version: number) =>
    resolveVersion(source, version).events.find(
      (e) => e.name === "lead_submitted",
    );
  const values = (version: number, property: string) => {
    const type = lead(version)?.properties.find(
      (p) => p.name === property,
    )?.type;
    return type?.kind === "enum" ? type.values : undefined;
  };

  it("v3's heard_about has its eight values, and v4's nine", () => {
    expect(values(3, "heard_about")).toHaveLength(8);
    expect(values(3, "heard_about")).not.toContain("ai_assistant");
    expect(values(4, "heard_about")).toHaveLength(9);
    expect(values(4, "heard_about")).toContain("ai_assistant");
  });

  it("v3's lead_submitted has neither follow-up", () => {
    const names = lead(3)?.properties.map((p) => p.name);
    expect(names).not.toContain("ai_tool");
    expect(names).not.toContain("search_engine");
  });

  it("v4 adds the follow-ups as optional enums", () => {
    expect(values(4, "ai_tool")).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "perplexity",
      "copilot",
      "other",
    ]);
    expect(values(4, "search_engine")).toEqual([
      "google",
      "bing",
      "duckduckgo",
      "ecosia",
      "other",
    ]);
    for (const name of ["ai_tool", "search_engine"]) {
      expect(lead(4)?.properties.find((p) => p.name === name)?.required).toBe(
        false,
      );
    }
  });

  it("the dashboard gains both insights at v4 and has neither at v3", () => {
    const keys = (version: number) =>
      resolveDashboard(source, version).map((d) => d.key);
    const added = [
      "action.lead_submitted_by_ai_tool",
      "action.lead_submitted_by_search_engine",
    ];
    for (const key of added) {
      expect(keys(3)).not.toContain(key);
      expect(keys(4)).toContain(key);
    }
    expect(keys(4).filter((k) => !keys(3).includes(k))).toEqual(added);
    const insight = resolveDashboard(source, 4).find(
      (d) => d.key === "action.lead_submitted_by_ai_tool",
    );
    expect(insight).toMatchObject({
      kind: "trend",
      interval: "month",
      breakdown: { property: "ai_tool", scope: "event" },
    });
  });

  it("the docs say the prompt and the search are never sent", () => {
    const docs = renderMarkdown(source);
    expect(docs).toContain(
      "What the visitor asked the assistant is never sent",
    );
    expect(docs).toContain("What the visitor searched for is never sent");
  });
});

describe("the channel table", () => {
  const rawChannels = (): Record<string, unknown> =>
    JSON.parse(readFileSync(`${root}contract/channels.json`, "utf8")) as Record<
      string,
      unknown
    >;
  const channelProblems = (
    mutate: (json: Record<string, unknown>) => void,
  ): string[] => {
    const json = rawChannels();
    mutate(json);
    try {
      validateChannels(json);
    } catch (error) {
      if (error instanceof ContractError) return error.problems;
      throw error;
    }
    return [];
  };

  it("is valid", () => {
    expect(() => validateChannels(rawChannels())).not.toThrow();
  });

  it("names an unknown key", () => {
    expect(
      channelProblems((j) => {
        j["extra"] = [];
      }),
    ).toContainEqual("channels.json: unknown key extra");
  });

  it("names a source filed under two categories", () => {
    expect(
      channelProblems((j) => {
        push(j, ["sources", "social"], "google");
      }),
    ).toContainEqual(expect.stringContaining("google is also in search"));
  });

  it("names a domain with an unknown category", () => {
    expect(
      channelProblems((j) => {
        set(j, ["domains", "example.com"], "print");
      }),
    ).toContainEqual("domains.example.com: unknown category print");
  });

  it("names a source that is not lowercase", () => {
    expect(
      channelProblems((j) => {
        push(j, ["sources", "search"], "Kagi2");
      }),
    ).toContainEqual(expect.stringContaining("must be lowercase"));
  });
});

describe("generated files", () => {
  it("src/generated/channels.ts is current", () => {
    const channels = validateChannels(
      JSON.parse(readFileSync(`${root}contract/channels.json`, "utf8")),
    );
    expect(readFileSync(`${root}src/generated/channels.ts`, "utf8")).toBe(
      renderChannels(channels),
    );
  });

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
