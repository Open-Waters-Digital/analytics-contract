/**
 * Reading `contract/events.json`: validating its shape, resolving any version's
 * list from the `since` markers, and rendering the generated files. Used by
 * `generate.ts`, `freeze.ts` and the contract tests, so all three read the
 * source the same way.
 */
import type {
  DashboardInsight,
  ListedEvent,
  Origin,
  PropertySpec,
  PropertyType,
  Stage,
  SuperProperty,
} from "../src/contract-types.js";

// ── Source shape ────────────────────────────────────────────────────────────

type SourceType =
  "string" | "integer" | "boolean" | { enum: (string | number)[] };

interface SourceProperty {
  name: string;
  since: number;
  type: SourceType;
  required: boolean;
  nullable?: boolean;
  doc?: string;
}

interface SourceEvent {
  name: string;
  since: number;
  stage: Stage;
  origin: Origin;
  firedWhen: string;
  properties: SourceProperty[];
}

interface SourceSuperProperty {
  name: string;
  since: number;
  type: SourceType;
  origin: Origin | "both";
  example: string;
  doc: string;
}

interface SourceStage {
  key: Stage | "intelligence";
  title: string;
  question: string;
  intro: string[];
  notes: string[];
  dashboardNote?: string;
}

type SourceInsight = DashboardInsight & { since: number };

export interface ContractSource {
  versions: { version: number; date: string; change: string }[];
  superProperties: SourceSuperProperty[];
  pageTypes: { doc: string; values: { value: string; since: number }[] };
  stages: SourceStage[];
  posthogEvents: { name: string; source: string; carries: string }[];
  events: SourceEvent[];
  dashboard: { name: string; doc: string; insights: SourceInsight[] };
  changing: string[];
}

export class ContractError extends Error {
  constructor(readonly problems: string[]) {
    super(`contract/events.json is invalid:\n  - ${problems.join("\n  - ")}`);
    this.name = "ContractError";
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

const STAGES: readonly string[] = [
  "attention",
  "intent",
  "action",
  "consent",
  "revenue",
];
const ORIGINS: readonly string[] = ["browser", "server"];
const SNAKE = /^[a-z][a-z0-9_]*$/;
const MATHS: readonly string[] = ["total", "unique_visitors", "sum"];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Checks the whole file and reports every problem at once, each naming where
 * it is, so one run shows everything to fix.
 */
export function validateSource(raw: unknown): ContractSource {
  const problems: string[] = [];
  const fail = (where: string, what: string) =>
    problems.push(`${where}: ${what}`);

  if (!isObject(raw))
    throw new ContractError(["the file is not a JSON object"]);

  const versions = Array.isArray(raw["versions"]) ? raw["versions"] : [];
  if (versions.length === 0)
    fail("versions", "at least one version is required");
  versions.forEach((v, i) => {
    if (!isObject(v) || v["version"] !== i + 1) {
      fail(
        `versions[${i}]`,
        `expected version ${i + 1}; versions start at 1 with no gaps`,
      );
    } else {
      if (
        typeof v["date"] !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(v["date"])
      ) {
        fail(`version ${i + 1}`, "date must be YYYY-MM-DD");
      }
      if (typeof v["change"] !== "string" || v["change"] === "") {
        fail(`version ${i + 1}`, "change must describe the version");
      }
    }
  });
  const current = versions.length;
  const checkSince = (where: string, since: unknown) => {
    if (
      typeof since !== "number" ||
      !Number.isInteger(since) ||
      since < 1 ||
      since > current
    ) {
      fail(where, `since must be a version from 1 to ${current}`);
    }
  };

  const checkType = (where: string, type: unknown) => {
    if (type === "string" || type === "integer" || type === "boolean") return;
    if (isObject(type) && Array.isArray(type["enum"])) {
      const values = type["enum"];
      if (values.length === 0) fail(where, "an enum needs at least one value");
      if (
        !values.every((x) => typeof x === "string" || typeof x === "number")
      ) {
        fail(where, "enum values must be strings or numbers");
      }
      if (new Set(values).size !== values.length)
        fail(where, "enum values must be unique");
      return;
    }
    fail(where, `unknown type ${JSON.stringify(type)}`);
  };

  const events = Array.isArray(raw["events"]) ? raw["events"] : [];
  const eventNames = new Set<string>();
  events.forEach((e, i) => {
    if (!isObject(e) || typeof e["name"] !== "string") {
      fail(`events[${i}]`, "an event needs a name");
      return;
    }
    const where = `event ${e["name"]}`;
    if (!SNAKE.test(e["name"])) fail(where, "names are snake_case");
    if (eventNames.has(e["name"])) fail(where, "duplicate event");
    eventNames.add(e["name"]);
    checkSince(where, e["since"]);
    if (!STAGES.includes(e["stage"] as string))
      fail(where, `unknown stage ${String(e["stage"])}`);
    if (!ORIGINS.includes(e["origin"] as string)) {
      fail(where, `unknown origin ${String(e["origin"])}`);
    }
    if (typeof e["firedWhen"] !== "string")
      fail(where, "firedWhen is required");
    const properties = Array.isArray(e["properties"]) ? e["properties"] : [];
    const names = new Set<string>();
    properties.forEach((p, j) => {
      if (!isObject(p) || typeof p["name"] !== "string") {
        fail(`${where} properties[${j}]`, "a property needs a name");
        return;
      }
      const pw = `${where}.${p["name"]}`;
      if (!SNAKE.test(p["name"])) fail(pw, "names are snake_case");
      if (names.has(p["name"])) fail(pw, "duplicate property");
      names.add(p["name"]);
      checkSince(pw, p["since"]);
      if (
        typeof p["since"] === "number" &&
        typeof e["since"] === "number" &&
        p["since"] < e["since"]
      ) {
        fail(pw, "a property cannot be older than its event");
      }
      if (typeof p["required"] !== "boolean")
        fail(pw, "required must be true or false");
      if (
        p["required"] === true &&
        typeof p["since"] === "number" &&
        typeof e["since"] === "number" &&
        p["since"] > e["since"]
      ) {
        fail(
          pw,
          "a property added after its event must be optional, or old senders break",
        );
      }
      checkType(pw, p["type"]);
    });
  });

  const superProperties = Array.isArray(raw["superProperties"])
    ? raw["superProperties"]
    : [];
  const superNames = new Set<string>();
  superProperties.forEach((s, i) => {
    if (!isObject(s) || typeof s["name"] !== "string") {
      fail(`superProperties[${i}]`, "a super property needs a name");
      return;
    }
    const where = `super property ${s["name"]}`;
    if (superNames.has(s["name"])) fail(where, "duplicate super property");
    superNames.add(s["name"]);
    checkSince(where, s["since"]);
    checkType(where, s["type"]);
    if (!["browser", "server", "both"].includes(s["origin"] as string)) {
      fail(where, "origin must be browser, server or both");
    }
  });

  const pageTypes = isObject(raw["pageTypes"]) ? raw["pageTypes"] : {};
  const pageValues = Array.isArray(pageTypes["values"])
    ? pageTypes["values"]
    : [];
  if (pageValues.length === 0)
    fail("pageTypes", "at least one page type is required");
  const seenPages = new Set<string>();
  pageValues.forEach((p, i) => {
    if (
      !isObject(p) ||
      typeof p["value"] !== "string" ||
      !SNAKE.test(p["value"])
    ) {
      fail(`pageTypes.values[${i}]`, "a page type is a snake_case value");
      return;
    }
    if (seenPages.has(p["value"]))
      fail(`page type ${p["value"]}`, "duplicate page type");
    seenPages.add(p["value"]);
    checkSince(`page type ${p["value"]}`, p["since"]);
  });

  const dashboard = isObject(raw["dashboard"]) ? raw["dashboard"] : {};
  const insights = Array.isArray(dashboard["insights"])
    ? dashboard["insights"]
    : [];
  const keys = new Set<string>();
  insights.forEach((d, i) => {
    if (!isObject(d) || typeof d["key"] !== "string") {
      fail(`dashboard.insights[${i}]`, "an insight needs a key");
      return;
    }
    const where = `insight ${d["key"]}`;
    if (keys.has(d["key"])) fail(where, "duplicate insight key");
    keys.add(d["key"]);
    checkSince(where, d["since"]);
    if (!STAGES.includes(d["stage"] as string))
      fail(where, `unknown stage ${String(d["stage"])}`);
    if (!["trend", "funnel", "ratio"].includes(d["kind"] as string)) {
      fail(where, `unknown kind ${String(d["kind"])}`);
    }
    const series = Array.isArray(d["series"]) ? d["series"] : [];
    if (series.length === 0)
      fail(where, "an insight needs at least one series");
    if (d["kind"] === "ratio" && series.length !== 2)
      fail(where, "a ratio needs exactly two series");
    series.forEach((s, j) => {
      if (!isObject(s) || typeof s["event"] !== "string") {
        fail(`${where} series[${j}]`, "a series needs an event");
        return;
      }
      if (!s["event"].startsWith("$") && !eventNames.has(s["event"])) {
        fail(`${where} series[${j}]`, `unknown event ${s["event"]}`);
      }
      if (!MATHS.includes(s["math"] as string)) {
        fail(`${where} series[${j}]`, `unknown math ${String(s["math"])}`);
      }
      if (s["math"] === "sum" && typeof s["property"] !== "string") {
        fail(`${where} series[${j}]`, "a sum needs a property");
      }
    });
  });

  if (problems.length > 0) throw new ContractError(problems);
  return raw as unknown as ContractSource;
}

// ── Resolving a version ─────────────────────────────────────────────────────

export interface ResolvedVersion {
  version: number;
  events: ListedEvent[];
  superProperties: SuperProperty[];
  pageTypes: string[];
}

function toType(type: SourceType): PropertyType {
  if (typeof type === "string") return { kind: type };
  return { kind: "enum", values: type.enum };
}

function toProperty(p: SourceProperty): PropertySpec {
  return {
    name: p.name,
    type: toType(p.type),
    required: p.required,
    nullable: p.nullable ?? false,
  };
}

export function currentVersion(source: ContractSource): number {
  return source.versions.length;
}

/** Everything a version contains. This, and only this, is frozen on publish. */
export function resolveVersion(
  source: ContractSource,
  version: number,
): ResolvedVersion {
  return {
    version,
    events: source.events
      .filter((e) => e.since <= version)
      .map((e) => ({
        name: e.name,
        stage: e.stage,
        origin: e.origin,
        properties: e.properties
          .filter((p) => p.since <= version)
          .map(toProperty),
      })),
    superProperties: source.superProperties
      .filter((s) => s.since <= version)
      .map((s) => ({ name: s.name, type: toType(s.type), origin: s.origin })),
    pageTypes: source.pageTypes.values
      .filter((p) => p.since <= version)
      .map((p) => p.value),
  };
}

export function resolveDashboard(
  source: ContractSource,
  version: number,
): DashboardInsight[] {
  return source.dashboard.insights
    .filter((d) => d.since <= version)
    .map(({ since: _since, ...insight }) => insight);
}

// ── Rendering TypeScript ────────────────────────────────────────────────────

const HEADER =
  "// Generated from contract/events.json by scripts/generate.ts. Do not edit:\n" +
  "// change the source and run `pnpm run generate`.\n";

function tsType(p: PropertySpec): string {
  let base: string;
  switch (p.type.kind) {
    case "string":
      base = "string";
      break;
    case "integer":
      base = "number";
      break;
    case "boolean":
      base = "boolean";
      break;
    case "enum":
      base = p.type.values.map((v) => JSON.stringify(v)).join(" | ");
  }
  return p.nullable ? `${base} | null` : base;
}

function eventsInterface(name: string, events: ListedEvent[]): string {
  const body = events
    .map((e) => {
      if (e.properties.length === 0)
        return `  ${e.name}: Record<string, never>;`;
      const props = e.properties
        .map((p) => `    ${p.name}${p.required ? "" : "?"}: ${tsType(p)};`)
        .join("\n");
      return `  ${e.name}: {\n${props}\n  };`;
    })
    .join("\n");
  return `export interface ${name} {\n${body}\n}\n`;
}

const literal = (value: unknown): string => JSON.stringify(value, null, 2);

export function renderTypeScript(source: ContractSource): string {
  const current = currentVersion(source);
  const versions = source.versions.map((v) => v.version);
  const resolved = versions.map((v) => resolveVersion(source, v));
  const latest = resolved[resolved.length - 1];
  if (!latest) throw new ContractError(["no versions"]);

  const out: string[] = [HEADER];
  out.push(
    'import type { DashboardInsight, ListedEvent, SuperProperty } from "../contract-types.js";\n',
  );
  out.push(`/** The taxonomy version this release of the package sends. */`);
  out.push(`export const CURRENT_VERSION = ${current};`);
  out.push(`/** As sent in the \`taxonomy_version\` property: a string. */`);
  out.push(
    `export const TAXONOMY_VERSION = ${JSON.stringify(String(current))};`,
  );
  out.push(`export const VERSIONS = [${versions.join(", ")}] as const;`);
  out.push(`export type TaxonomyVersion = (typeof VERSIONS)[number];\n`);

  out.push(`/** The page types at the current version. */`);
  out.push(
    `export const PAGE_TYPES = ${JSON.stringify(latest.pageTypes)} as const;`,
  );
  out.push(`export type PageType = (typeof PAGE_TYPES)[number];\n`);

  for (const r of resolved) {
    out.push(
      eventsInterface(
        `BrowserEventsV${r.version}`,
        r.events.filter((e) => e.origin === "browser"),
      ),
    );
    out.push(
      eventsInterface(
        `ServerEventsV${r.version}`,
        r.events.filter((e) => e.origin === "server"),
      ),
    );
  }
  out.push(`/** Browser events at the current version. */`);
  out.push(`export type BrowserEvents = BrowserEventsV${current};`);
  out.push(`/** Server events at the current version. */`);
  out.push(`export type ServerEvents = ServerEventsV${current};\n`);

  const byVersion = (make: (v: number) => unknown) =>
    `{\n${versions.map((v) => `  ${v}: ${literal(make(v)).replace(/\n/g, "\n  ")},`).join("\n")}\n}`;

  out.push(
    `/** Every version's events, as published. Never edited once published. */`,
  );
  out.push(
    `export const EVENT_LISTS: Readonly<Record<TaxonomyVersion, readonly ListedEvent[]>> = ${byVersion(
      (v) => resolveVersion(source, v).events,
    )};\n`,
  );
  out.push(
    `export const SUPER_PROPERTIES: Readonly<Record<TaxonomyVersion, readonly SuperProperty[]>> = ${byVersion(
      (v) => resolveVersion(source, v).superProperties,
    )};\n`,
  );
  out.push(
    `export const PAGE_TYPES_BY_VERSION: Readonly<Record<TaxonomyVersion, readonly string[]>> = ${byVersion(
      (v) => resolveVersion(source, v).pageTypes,
    )};\n`,
  );
  out.push(
    `export const BASELINE_DASHBOARD_NAME = ${JSON.stringify(source.dashboard.name)};\n`,
  );
  out.push(
    `/** The baseline dashboard at each version. Insights are matched by key. */`,
  );
  out.push(
    `export const BASELINE_DASHBOARDS: Readonly<Record<TaxonomyVersion, readonly DashboardInsight[]>> = ${byVersion(
      (v) => resolveDashboard(source, v),
    )};`,
  );
  return out.join("\n") + "\n";
}

// ── Rendering the documentation ─────────────────────────────────────────────

const cell = (text: string) => text.replace(/\|/g, "\\|");

function propertyDoc(p: SourceProperty): string {
  if (p.doc !== undefined)
    return p.doc === "" ? `\`${p.name}\`` : `\`${p.name}\` (${p.doc})`;
  if (typeof p.type === "object") {
    return `\`${p.name}\` (${p.type.enum.map((v) => `\`${v}\``).join(" | ")})`;
  }
  if (p.type === "boolean") return `\`${p.name}\` (boolean)`;
  return `\`${p.name}\``;
}

function sinceNote(since: number, current: number): string {
  return since > 1 && since === current
    ? ` *(new in v${since})*`
    : since > 1
      ? ` *(v${since})*`
      : "";
}

export function renderMarkdown(source: ContractSource): string {
  const current = currentVersion(source);
  const out: string[] = [];
  out.push(
    "<!-- Generated from contract/events.json by scripts/generate.ts. Do not edit. -->\n",
  );
  out.push("# Open Waters event list\n");
  out.push(`**Taxonomy version: ${current}**\n`);
  out.push(
    "Every Open Waters site sends these events and nothing else, apart from PostHog's own `$`-prefixed events. Names are `object_verb`, in snake_case and the past tense. Properties are snake_case.\n",
  );
  out.push(
    'This file is generated from `contract/events.json` in `@open-waters-digital/analytics`, and ships inside the package at `node_modules/@open-waters-digital/analytics/docs/events.md`. The package\'s types make an unlisted event a type error. Change the contract only as "Changing this list" describes.\n',
  );
  out.push("---\n");

  out.push("## Super properties\n");
  out.push("Sent automatically on every event, browser and server side.\n");
  out.push("| Property | Type | Example | Notes |");
  out.push("| -------- | ---- | ------- | ----- |");
  for (const s of source.superProperties) {
    const type = typeof s.type === "string" ? s.type : "string";
    const example = s.example.replace("{version}", String(current));
    out.push(
      `| \`${s.name}\`${sinceNote(s.since, current)} | ${type} | ${example} | ${cell(s.doc)} |`,
    );
  }
  out.push("");
  out.push(
    `**Page types.** ${source.pageTypes.values.map((p) => `\`${p.value}\``).join(", ")}. ${source.pageTypes.doc}\n`,
  );

  for (const stage of source.stages) {
    out.push("---\n");
    out.push(`## ${stage.title}: ${stage.question}\n`);
    for (const p of stage.intro) out.push(`${p}\n`);
    if (stage.key === "attention") {
      out.push("| Event | Source | Carries |");
      out.push("| ----- | ------ | ------- |");
      for (const e of source.posthogEvents)
        out.push(`| \`${e.name}\` | ${e.source} | ${e.carries} |`);
      out.push("");
    }
    const events = source.events.filter((e) => e.stage === stage.key);
    if (events.length > 0) {
      out.push("| Event | Fired when | Properties |");
      out.push("| ----- | ---------- | ---------- |");
      for (const e of events) {
        const props = e.properties
          .map((p) => propertyDoc(p) + sinceNote(p.since, current))
          .join(", ");
        out.push(
          `| \`${e.name}\`${sinceNote(e.since, current)} | ${cell(e.firedWhen)} | ${cell(props)} |`,
        );
      }
      out.push("");
    }
    for (const n of stage.notes) out.push(`${n}\n`);
  }

  out.push("---\n");
  out.push("## Baseline dashboard\n");
  out.push(`Named **${source.dashboard.name}**. ${source.dashboard.doc}\n`);
  out.push("| Stage | Insights |");
  out.push("| ----- | -------- |");
  for (const stage of source.stages) {
    const insights = source.dashboard.insights.filter(
      (d) => d.stage === stage.key,
    );
    if (insights.length === 0) continue;
    const note = stage.dashboardNote ? `${stage.dashboardNote} ` : "";
    const list = insights
      .map((d) => `${d.title}${sinceNote(d.since, current)}`)
      .join(". ");
    out.push(`| ${stage.title} | ${cell(note + list)} |`);
  }
  out.push("");

  out.push("---\n");
  out.push("## Changing this list\n");
  source.changing.forEach((c, i) => out.push(`${i + 1}. ${c}`));
  out.push("");
  out.push("## Changelog\n");
  out.push("| Version | Date | Change |");
  out.push("| ------- | ---- | ------ |");
  for (const v of source.versions)
    out.push(`| ${v.version} | ${v.date} | ${cell(v.change)} |`);
  return out.join("\n") + "\n";
}
