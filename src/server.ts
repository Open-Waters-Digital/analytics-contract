/**
 * Open Waters analytics on the server: the events a site's form handler sends,
 * such as `lead_submitted`, which ad blockers cannot remove.
 *
 * Behaviour is the openwaters-analytics skill's reference `analytics-server.ts`
 * at taxonomy v2, with two changes: the site is bound once through
 * `createServerCapture`, so a handler cannot send under the wrong slug, and
 * every request to PostHog has a timeout, so a hung upstream cannot hold the
 * work that called it.
 */
import { PostHog } from "posthog-node";

import type { Attribution } from "./channels.js";
import { TAXONOMY_VERSION, type ServerEvents } from "./generated/contract.js";

export type { ServerEvents };
export type { Attribution };

// Server events go straight to PostHog, not through the proxy: ad blockers do
// not run on the server.
const EU_INGEST_HOST = "https://eu.i.posthog.com";

/** Per request to PostHog. */
export const REQUEST_TIMEOUT_MS = 5_000;
/**
 * When the returned promise resolves at the latest, however PostHog behaves.
 * A retry after a failed request may still complete after this, in the
 * background, on a long-running server.
 */
export const CAPTURE_DEADLINE_MS = 5_000;

export interface ServerCaptureConfig {
  /** The client's slug in the analytics app's registry. */
  site: string;
  /** The PostHog project key. Empty or missing makes every capture a no-op. */
  key: string | undefined;
  /** Overrides the EU ingestion host. For tests. */
  host?: string;
}

export type ServerCapture = <E extends keyof ServerEvents>(
  event: E,
  properties: ServerEvents[E],
) => Promise<void>;

/**
 * Returns the capture function for one site. Call it once per process, and
 * call the result with `void` after the real work has succeeded. It never
 * throws and never rejects; a failure is logged with the event name and
 * nothing from the properties.
 */
export function createServerCapture(
  config: ServerCaptureConfig,
): ServerCapture {
  const { site, key } = config;
  let client: PostHog | null = null;

  return async (event, properties) => {
    if (!key) return;
    try {
      client ??= new PostHog(key, {
        host: config.host ?? EU_INGEST_HOST,
        flushAt: 1,
        flushInterval: 0,
        requestTimeout: REQUEST_TIMEOUT_MS,
        fetchRetryCount: 2,
        fetchRetryDelay: 1_000,
      });
      client.capture({
        // A fresh id per event: no person profile, nothing to link to a visitor.
        distinctId: crypto.randomUUID(),
        event,
        properties: {
          ...properties,
          // Every lead carries a channel (spec lead-attribution). It is
          // optional in the contract, so a site that has not wired the
          // attribution is recorded as "unknown", not missing.
          ...(event === "lead_submitted" &&
          (properties as { channel?: string }).channel === undefined
            ? { channel: "unknown" }
            : {}),
          site,
          taxonomy_version: TAXONOMY_VERSION,
          $process_person_profile: false,
        },
      });
      const deadline = new Promise<"late">((resolve) => {
        setTimeout(() => resolve("late"), CAPTURE_DEADLINE_MS).unref();
      });
      const outcome = await Promise.race([
        client.flush().then(() => "sent" as const),
        deadline,
      ]);
      if (outcome === "late")
        console.error(`analytics: ${event} not confirmed in time`);
    } catch (error) {
      // The error's name only: a message from an HTTP client can echo the body.
      console.error(
        `analytics: ${event} capture failed (${error instanceof Error ? error.name : "unknown"})`,
      );
    }
  };
}

// ── Attribution ─────────────────────────────────────────────────────────────

/** Longest attribution field accepted, as sent by the browser. */
const MAX_ATTRIBUTION_FIELD = 2_048;
const MAX_VALUE = 100;
const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "referring_domain",
] as const;

/**
 * Six or more digits, ignoring spaces: a phone number or an account number in
 * a URL anyone can craft. Dashes still separate, so a dated campaign such as
 * `sale-2026-09-24` is kept.
 */
const DIGIT_RUN = /\d{6,}/;

function cleanValue(raw: string): string | undefined {
  // Checked on the raw value, before anything is removed, or the @ would go.
  if (raw.includes("@") || DIGIT_RUN.test(raw.replace(/\s+/g, ""))) {
    return undefined;
  }
  const value = raw
    .toLowerCase()
    .replace(/[^a-z0-9._+\- ]/g, "")
    .trim()
    .slice(0, MAX_VALUE)
    .trim();
  return value === "" ? undefined : value;
}

function cleanHostname(raw: string): string | undefined {
  let host = raw.trim().toLowerCase();
  if (host.includes("/")) {
    try {
      host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
    } catch {
      return undefined;
    }
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && host.length <= 253
    ? host
    : undefined;
}

/**
 * Parses the `ow_attribution` field a form sent, trusting nothing: a string of
 * at most 2 KB holding a JSON object, of which only the four attribution keys
 * are read, each a string. Values are lowercased, trimmed, cut to 100
 * characters and stripped to letters, digits, `.`, `_`, `+`, `-` and spaces; a
 * value containing `@` or six or more digits is dropped, and the referring
 * domain is reduced to a hostname.
 *
 * Returns `null` for anything else (a missing field, an empty string, a
 * nested object, an array, a number, oversized or invalid JSON, a known key
 * that is not a string), which classifies as an `unknown` channel. Returns
 * `{}` when every value was dropped, which classifies as `direct`. Never
 * throws. Any other key, such as a forged `channel`, is ignored: the channel
 * is always computed here, with `classifyChannel`.
 */
export function parseAttribution(raw: unknown): Attribution | null {
  if (typeof raw !== "string" || raw.length > MAX_ATTRIBUTION_FIELD)
    return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const input = parsed as Record<string, unknown>;
  const result: Attribution = {};
  for (const key of KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string") return null;
    const cleaned =
      key === "referring_domain" ? cleanHostname(value) : cleanValue(value);
    if (cleaned !== undefined) result[key] = cleaned;
  }
  return result;
}
