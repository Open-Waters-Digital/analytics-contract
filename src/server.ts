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

import { TAXONOMY_VERSION, type ServerEvents } from "./generated/contract.js";

export type { ServerEvents };

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
