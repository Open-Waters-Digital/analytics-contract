import { describe, expect, it } from "vitest";

import { classifyChannel, type Attribution } from "../src/contract.js";

/**
 * Each case: the attribution, PostHog's channel type for the same source,
 * medium, campaign and referring domain (from its channel_type.py rules and
 * channel_definitions.json, 24 September 2026), and ours under the mapping in
 * split-leads-by-channel's design, D4.
 */
const CASES: [string, Attribution | null, string, string][] = [
  // Nothing to go on
  ["nothing sent (no JavaScript)", null, "n/a", "unknown"],
  ["an empty attribution", {}, "Direct", "direct"],
  ["utm_source=direct", { utm_source: "direct" }, "Direct", "direct"],
  ["utm_source=(direct)", { utm_source: "(direct)" }, "Direct", "direct"],

  // Paid
  [
    "google cpc",
    { utm_source: "google", utm_medium: "cpc" },
    "Paid Search",
    "paid_search",
  ],
  [
    "bing ppc",
    { utm_source: "bing", utm_medium: "ppc" },
    "Paid Search",
    "paid_search",
  ],
  [
    "duckduckgo paid_search",
    { utm_source: "duckduckgo", utm_medium: "paid_search" },
    "Paid Search",
    "paid_search",
  ],
  [
    "facebook paid",
    { utm_source: "facebook", utm_medium: "paid" },
    "Paid Social",
    "paid_social",
  ],
  [
    "instagram paidsocial",
    { utm_source: "instagram", utm_medium: "paidsocial" },
    "Paid Social",
    "paid_social",
  ],
  [
    "linkedin cpc",
    { utm_source: "linkedin", utm_medium: "cpc" },
    "Paid Social",
    "paid_social",
  ],
  [
    "tiktok cpm",
    { utm_source: "tiktok", utm_medium: "cpm" },
    "Paid Social",
    "paid_social",
  ],
  [
    "paid with only a search referrer",
    { utm_medium: "cpc", referring_domain: "www.google.com" },
    "Paid Search",
    "paid_search",
  ],
  [
    "youtube cpv",
    { utm_source: "youtube", utm_medium: "cpv" },
    "Paid Video",
    "other_paid",
  ],
  [
    "amazon cpc",
    { utm_source: "amazon", utm_medium: "cpc" },
    "Paid Shopping",
    "other_paid",
  ],
  [
    "retargeting from an unknown network",
    { utm_source: "adroll", utm_medium: "retargeting" },
    "Paid Unknown",
    "other_paid",
  ],
  [
    "cross-network campaign",
    { utm_source: "google", utm_medium: "cpc", utm_campaign: "cross-network" },
    "Cross Network",
    "other_paid",
  ],

  // Email
  [
    "newsletter email",
    { utm_source: "newsletter", utm_medium: "email" },
    "Email",
    "email",
  ],
  [
    "e-mail spelling",
    { utm_source: "mailchimp", utm_medium: "e-mail" },
    "Email",
    "email",
  ],
  [
    "a known source wins over an email medium",
    { utm_source: "google", utm_medium: "email" },
    "Organic Search",
    "organic_search",
  ],

  // AI
  ["chatgpt.com referrer", { referring_domain: "chatgpt.com" }, "AI", "ai"],
  ["claude.ai referrer", { referring_domain: "claude.ai" }, "AI", "ai"],
  ["perplexity source", { utm_source: "perplexity" }, "AI", "ai"],
  [
    "chatgpt source, as ChatGPT tags its links",
    { utm_source: "chatgpt.com" },
    "AI",
    "ai",
  ],
  [
    "gemini.google.com is AI, not search",
    { referring_domain: "gemini.google.com" },
    "AI",
    "ai",
  ],
  [
    "copilot.microsoft.com",
    { referring_domain: "copilot.microsoft.com" },
    "AI",
    "ai",
  ],

  // Organic search
  [
    "google referrer, no tags",
    { referring_domain: "www.google.com" },
    "Organic Search",
    "organic_search",
  ],
  [
    "google.co.uk referrer",
    { referring_domain: "www.google.co.uk" },
    "Organic Search",
    "organic_search",
  ],
  [
    "bing referrer",
    { referring_domain: "www.bing.com" },
    "Organic Search",
    "organic_search",
  ],
  [
    "duckduckgo referrer",
    { referring_domain: "duckduckgo.com" },
    "Organic Search",
    "organic_search",
  ],
  [
    "ecosia source",
    { utm_source: "ecosia" },
    "Organic Search",
    "organic_search",
  ],
  [
    "uk.search.yahoo.com",
    { referring_domain: "uk.search.yahoo.com" },
    "Organic Search",
    "organic_search",
  ],

  // Organic social
  [
    "instagram social",
    { utm_source: "instagram", utm_medium: "social" },
    "Organic Social",
    "organic_social",
  ],
  [
    "facebook link shim",
    { referring_domain: "l.facebook.com" },
    "Organic Social",
    "organic_social",
  ],
  [
    "t.co (Twitter/X)",
    { referring_domain: "t.co" },
    "Organic Social",
    "organic_social",
  ],
  [
    "lnkd.in (LinkedIn)",
    { referring_domain: "lnkd.in" },
    "Organic Social",
    "organic_social",
  ],
  [
    "pinterest referrer",
    { referring_domain: "uk.pinterest.com" },
    "Organic Social",
    "organic_social",
  ],
  [
    "an unknown source with a social medium",
    { utm_source: "partner-post", utm_medium: "social" },
    "Organic Social",
    "organic_social",
  ],
  [
    "youtube referrer",
    { referring_domain: "www.youtube.com" },
    "Organic Video",
    "organic_social",
  ],

  // Referral
  [
    "another site links to us",
    { referring_domain: "www.houzz.co.uk" },
    "Referral",
    "referral",
  ],
  [
    "a referral medium",
    { utm_source: "partner", utm_medium: "referral" },
    "Referral",
    "referral",
  ],
  [
    "an affiliate medium",
    { utm_source: "network", utm_medium: "affiliate" },
    "Affiliate",
    "referral",
  ],
  [
    "etsy referrer",
    { referring_domain: "www.etsy.com" },
    "Organic Shopping",
    "referral",
  ],

  // Tags that match nothing
  [
    "an unknown source, no medium, no referrer",
    { utm_source: "flyer" },
    "Unknown",
    "unknown",
  ],
  [
    "an sms medium",
    { utm_source: "text-campaign", utm_medium: "sms" },
    "SMS",
    "unknown",
  ],
];

describe("classifyChannel", () => {
  it.each(CASES)(
    "%s (PostHog: %2$s)",
    (_label, attribution, _posthog, expected) => {
      expect(classifyChannel(attribution)).toBe(expected);
    },
  );

  it("ignores case and surrounding space", () => {
    expect(classifyChannel({ utm_source: " Google ", utm_medium: "CPC" })).toBe(
      "paid_search",
    );
  });

  it("is deterministic", () => {
    const a = { utm_source: "facebook", utm_medium: "paid" };
    expect(
      new Set(Array.from({ length: 5 }, () => classifyChannel(a))).size,
    ).toBe(1);
  });
});
