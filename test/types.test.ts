/**
 * Compile-time guarantees. `pnpm run typecheck` fails if any
 * `@ts-expect-error` below stops being an error, so these assert that the
 * generated types reject what the contract does not allow.
 */
import { expectTypeOf, it } from "vitest";

import { initAnalytics, track, type BrowserEvents } from "../src/browser.js";
import type {
  BrowserEventsV1,
  ServerEvents,
  ServerEventsV3,
} from "../src/contract.js";
import { createServerCapture } from "../src/server.js";

// Never called: only type checked.
function contractViolations(): void {
  // @ts-expect-error an event that is not in the contract
  track("newsletter_signed_up", {});

  // @ts-expect-error a required property missing
  track("cta_clicked", { cta_text: "Book" });

  // @ts-expect-error a value outside the enum
  track("contact_link_clicked", { channel: "sms" });

  // @ts-expect-error a depth that is not one of 25, 50, 75, 100
  track("scroll_depth_reached", { depth_percent: 60 });

  // @ts-expect-error a server event cannot be sent from the browser
  track("lead_submitted", { form_id: "contact", lead_type: "general" });

  // @ts-expect-error the site slug is required
  initAnalytics({ key: "k", apiHost: "h", spa: true, regulated: false });

  const capture = createServerCapture({ site: "s", key: undefined });
  const lead = { form_id: "contact", lead_type: "general" };
  // v4: the AI answer and its follow-up compile.
  void capture("lead_submitted", {
    ...lead,
    heard_about: "ai_assistant",
    ai_tool: "perplexity",
  });
  void capture("lead_submitted", {
    ...lead,
    heard_about: "search_engine",
    search_engine: "duckduckgo",
  });
  // @ts-expect-error an assistant outside the list
  void capture("lead_submitted", { ...lead, ai_tool: "askjeeves" });
  // @ts-expect-error a search engine outside the list
  void capture("lead_submitted", { ...lead, search_engine: "altavista" });
}
void contractViolations;

it("types follow the contract", () => {
  expectTypeOf<BrowserEvents["form_abandoned"]["last_field"]>().toEqualTypeOf<
    string | null
  >();
  expectTypeOf<BrowserEvents["cta_clicked"]["cta_location"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<ServerEvents["deal_won"]["value"]>().toEqualTypeOf<number>();
  expectTypeOf<BrowserEvents>().toHaveProperty("consent_updated");
  expectTypeOf<BrowserEventsV1>().not.toHaveProperty("consent_updated");
  expectTypeOf<"ai_assistant">().toExtend<
    NonNullable<ServerEvents["lead_submitted"]["heard_about"]>
  >();
  expectTypeOf<"ai_assistant">().not.toExtend<
    NonNullable<ServerEventsV3["lead_submitted"]["heard_about"]>
  >();
  expectTypeOf<ServerEventsV3["lead_submitted"]>().not.toHaveProperty(
    "ai_tool",
  );
});
