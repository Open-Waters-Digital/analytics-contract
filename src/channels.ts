/**
 * Classifying a lead's landing attribution into a channel, the same way on
 * every site and in the analytics app.
 *
 * The rules follow PostHog's channel types (posthog/hogql/database/schema/
 * channel_type.py), mapped onto the contract's shorter list, so a lead's
 * channel agrees with PostHog's web analytics channel for the same visit. The
 * source, medium and domain lists are contract/channels.json. The mapping and
 * its reasons are split-leads-by-channel's design, D4.
 */
import { CHANNEL_TABLE } from "./generated/channels.js";
import type { ServerEvents } from "./generated/contract.js";

export type Channel = NonNullable<ServerEvents["lead_submitted"]["channel"]>;

/** A lead's landing attribution, as parsed on the server. */
export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Hostname only. */
  referring_domain?: string;
}

type Category = keyof typeof CHANNEL_TABLE.sources;

const includes = (list: readonly string[], value: string): boolean =>
  list.includes(value);

function sourceCategory(source: string): Category | undefined {
  for (const [category, sources] of Object.entries(CHANNEL_TABLE.sources)) {
    if (includes(sources, source)) return category as Category;
  }
  // A source written as a domain ("google.com") classifies as one.
  return source.includes(".") ? domainCategory(source) : undefined;
}

function domainCategory(domain: string): Category | undefined {
  const host = domain.replace(/^www\./, "");
  const domains: Readonly<Record<string, Category>> = CHANNEL_TABLE.domains;
  // Exact domains first, so gemini.google.com is AI before google is search.
  const exact = domains[host] ?? domains[domain];
  if (exact) return exact;
  // Then any label of the hostname that is a known source: m.facebook.com,
  // google.co.uk, uk.search.yahoo.com.
  for (const label of host.split(".")) {
    for (const [category, sources] of Object.entries(CHANNEL_TABLE.sources)) {
      if (includes(sources, label)) return category as Category;
    }
  }
  return undefined;
}

function clean(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  return v ? v : undefined;
}

function organic(category: Category): Channel {
  switch (category) {
    case "ai":
      return "ai";
    case "search":
      return "organic_search";
    case "social":
    case "video":
      return "organic_social";
    case "shopping":
      return "referral";
  }
}

/**
 * The channel for a lead's attribution. `null` (nothing was sent, as from a
 * form without JavaScript, or it could not be parsed) is `unknown`; an empty
 * attribution (the visitor arrived with no source) is `direct`.
 */
export function classifyChannel(attribution: Attribution | null): Channel {
  if (attribution === null) return "unknown";
  const source = clean(attribution.utm_source);
  const medium = clean(attribution.utm_medium);
  const campaign = clean(attribution.utm_campaign);
  const domain = clean(attribution.referring_domain);
  if (!source && !medium && !campaign && !domain) return "direct";

  const { paid, mediums, directSources } = CHANNEL_TABLE;
  const bySource = source ? sourceCategory(source) : undefined;
  const byDomain = domain ? domainCategory(domain) : undefined;

  // Paid: PostHog's Cross Network, Paid Search, Paid Social, and every other
  // paid variant (video, shopping, display, unknown) as other_paid.
  if (campaign === paid.crossNetworkCampaign) return "other_paid";
  const isPaid =
    medium !== undefined &&
    (includes(paid.mediums, medium) || medium.startsWith(paid.mediumPrefix));
  if (isPaid) {
    const category = bySource ?? byDomain;
    if (category === "search") return "paid_search";
    if (category === "social") return "paid_social";
    return "other_paid";
  }

  if (source && includes(directSources, source) && !medium) return "direct";

  // Organic, in PostHog's order: the source, then the medium, then the
  // referring domain.
  if (bySource) return organic(bySource);
  if (medium) {
    if (includes(mediums.email, medium)) return "email";
    if (includes(mediums.social, medium) || includes(mediums.video, medium)) {
      return "organic_social";
    }
    if (includes(mediums.referral, medium)) return "referral";
  }
  if (byDomain) return organic(byDomain);
  if (domain) return "referral";
  return "unknown";
}
