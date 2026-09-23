/**
 * The shapes of the contract's runtime data. The data itself is generated into
 * `generated/contract.ts` from `contract/events.json`; these types are written
 * by hand because the generator and every reader depend on them.
 */

export type Stage = "attention" | "intent" | "action" | "consent" | "revenue";

/** Who sends the event: the site's browser code, or its server. */
export type Origin = "browser" | "server";

export type PropertyType =
  | { kind: "string" }
  | { kind: "integer" }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly (string | number)[] };

export interface PropertySpec {
  name: string;
  type: PropertyType;
  required: boolean;
  nullable: boolean;
}

export interface ListedEvent {
  name: string;
  stage: Stage;
  origin: Origin;
  properties: readonly PropertySpec[];
}

export interface SuperProperty {
  name: string;
  type: PropertyType;
  /** "browser" for properties only the browser can know, such as page_type. */
  origin: Origin | "both";
}

export type InsightMath = "total" | "unique_visitors" | "sum";

export interface InsightSeries {
  event: string;
  math: InsightMath;
  /** The numeric property summed, when math is "sum". */
  property?: string;
  /** Equality filters on event properties. */
  where?: Readonly<Record<string, string | number | boolean>>;
}

export interface DashboardInsight {
  /** Stable across versions and wording changes. Provisioning matches on it. */
  key: string;
  stage: Stage;
  title: string;
  /**
   * trend: one line or bar per series. funnel: the series in order.
   * ratio: the first series divided by the second.
   */
  kind: "trend" | "funnel" | "ratio";
  interval?: "day" | "week" | "month";
  series: readonly InsightSeries[];
  breakdown?: { property: string; scope: "event" | "session" };
}
