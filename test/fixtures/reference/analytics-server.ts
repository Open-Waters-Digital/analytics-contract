// Reference copy from the openwaters-analytics skill at taxonomy v2 (22 September 2026),
// used only by the parity tests. Deleted once the skill points at this package.
import { PostHog } from "posthog-node";
import { SITE_SLUG, TAXONOMY_VERSION, type ServerEvents } from "./analytics";

// Server events go straight to PostHog, not through the proxy: ad blockers do
// not run on the server.
const EU_INGEST_HOST = "https://eu.i.posthog.com";

let client: PostHog | null = null;

/**
 * Never throws and never blocks the caller on PostHog. On a long-running Node
 * server (Railway), call it with `void` after the real work has succeeded.
 */
export async function captureServerEvent<E extends keyof ServerEvents>(
  key: string | undefined,
  event: E,
  properties: ServerEvents[E],
): Promise<void> {
  if (!key) return;
  try {
    client ??= new PostHog(key, {
      host: EU_INGEST_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
    client.capture({
      // A fresh id per event: no person profile, nothing to link to a visitor.
      distinctId: crypto.randomUUID(),
      event,
      properties: {
        ...properties,
        site: SITE_SLUG,
        taxonomy_version: TAXONOMY_VERSION,
        $process_person_profile: false,
      },
    });
    await client.flush();
  } catch (error) {
    console.error("analytics: server capture failed", error);
  }
}
