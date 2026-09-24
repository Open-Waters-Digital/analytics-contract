<!-- Generated from contract/events.json by scripts/generate.ts. Do not edit. -->

# Open Waters event list

**Taxonomy version: 3**

Every Open Waters site sends these events and nothing else, apart from PostHog's own `$`-prefixed events. Names are `object_verb`, in snake_case and the past tense. Properties are snake_case.

This file is generated from `contract/events.json` in `@open-waters-digital/analytics`, and ships inside the package at `node_modules/@open-waters-digital/analytics/docs/events.md`. The package's types make an unlisted event a type error. Change the contract only as "Changing this list" describes.

---

## Super properties

Sent automatically on every event, browser and server side.

| Property | Type | Example | Notes |
| -------- | ---- | ------- | ----- |
| `site` | string | `radara` | The client slug. Matches the internal app's client registry |
| `taxonomy_version` | string | `"3"` | The version at the top of this file |
| `page_type` | string | `service` | From the element carrying `data-page-type`: `<body>` on Astro, `<main>` on Next.js. One of the page types below. Browser only |
| `ad_consent` *(v2)* | string | `unset` | `granted`, `denied` or `unset`: the visitor's current "Advertising" choice. Always `unset` on a site with no consent banner. Browser only. See the skill's `references/advertising.md`, "Reporting" |

**Page types.** `home`, `service`, `product`, `case_study`, `about`, `contact`, `article`, `listing`, `legal`, `other`. Add a new type here before using it on a site. These are what let the report compare "service pages" across clients whose URLs have nothing in common.

---

## Attention: are the right people finding us?

PostHog records these itself. No custom events.

| Event | Source | Carries |
| ----- | ------ | ------- |
| `$pageview` | posthog-js | URL, referrer, UTM parameters, device, country |
| `$pageleave` | posthog-js | Time on page and scroll |

Search Console and PageSpeed data are pulled into the internal app separately.

---

## Intent: what are they interested in?

| Event | Fired when | Properties |
| ----- | ---------- | ---------- |
| `cta_clicked` | A click on any element with `data-cta` | `cta_id` (stable slug, e.g. `hero-book-call`), `cta_text`, `cta_location` (section slug, e.g. `hero`) |
| `contact_link_clicked` | A click on a `tel:`, `mailto:` or WhatsApp link | `channel` (`phone` \| `email` \| `whatsapp`), `cta_location` |
| `file_downloaded` | A click on a link with `download`, or to a PDF, DOC(X), XLS(X), PPT(X), ZIP or CSV | `file_name`, `file_type` |
| `outbound_link_clicked` | A click on a link to another hostname | `link_domain` (hostname only, never the full URL) |
| `scroll_depth_reached` | The page first passes 25, 50, 75 or 100% scrolled | `depth_percent` |
| `video_played` | A video starts, once per video per page | `video_id` |

`cta_id` must be stable. Reports track it month on month, so a CTA whose wording changes keeps its id. A CTA that now does something different gets a new one.

---

## Action: did they act?

| Event | Fired when | Properties |
| ----- | ---------- | ---------- |
| `form_started` | First focus inside a `form[data-form-id]`, once per page | `form_id` |
| `form_error_shown` | A field fails validation and the error is shown | `form_id`, `field_name`, `error_type` (`required` \| `format` \| `too_long` \| `server`) |
| `form_abandoned` | The visitor leaves the page after `form_started` without submitting | `form_id`, `last_field` (field **name**), `fields_completed` (count) |
| `form_submitted` | The site's form code confirms a successful submission | `form_id` |
| `lead_submitted` | **Server.** The enquiry was delivered | `form_id`, `lead_type` (site-defined slug, e.g. `general`, `quote`, `partnership`), `channel` (from the tab's landing attribution, classified by the package; `unknown` when it could not tell. The server capture always sends it on `lead_submitted`) *(new in v3)*, `utm_source` (parsed on the server; never a value containing `@` or a long run of digits) *(new in v3)*, `utm_medium` *(new in v3)*, `utm_campaign` *(new in v3)*, `referring_domain` (hostname only) *(new in v3)*, `heard_about` (the visitor's own answer, where a site asks; each site maps its wording onto this list) *(new in v3)* |

`form_submitted` gives the funnel and the channel, because it shares a session with the page views. `lead_submitted` is the number reported to the client, because an ad blocker cannot remove it. Expect `form_submitted` to be a little lower. If it is *much* lower, that points to ad blocking or a broken client event, so investigate.

Never put field values, the message, or anything the visitor typed into any property.

---

## Consent: who can we measure beyond the baseline?

Only on sites with a consent banner, which means sites running paid advertising or replay under the skill's `references/advertising.md`. A site with no banner never sends it, and its absence there is not drift.

| Event | Fired when | Properties |
| ----- | ---------- | ---------- |
| `consent_updated` *(v2)* | The visitor makes an explicit choice in the banner or the settings control. Not sent on page loads that only read a stored choice | `advertising` (boolean) *(v2)*, `recordings` (boolean) *(v2)*, `source` (`banner` \| `settings`) *(v2)* |

It is sent through the cookieless baseline, as a count of how a banner is answered, which is a statistic about the site. Together with `ad_consent` it gives every report the coverage figure that consent-based data must state.

---

## Revenue: did it make money?

Server side only, sent from the CRM integration or entered through the internal app once the client reports outcomes. Not every client will have these at first, and reports say so rather than leaving the stage out.

| Event | Fired when | Properties |
| ----- | ---------- | ---------- |
| `lead_qualified` | The client confirms a lead was a real opportunity | `lead_type`, `form_id`, `channel` (carried from the lead, where the site stored it) *(new in v3)* |
| `deal_won` | A lead became paid work | `lead_type`, `value` (number, whole units), `currency` (ISO 4217), `channel` (carried from the lead, where the site stored it) *(new in v3)* |

---

## Intelligence: what did we learn?

Not events. The learning log in the internal app records what changed on the site and when (a new proposition, a redesigned form, a campaign launch) so reports can connect a change to what followed.

---

## Baseline dashboard

Named **Digital Dividend baseline**. Created in every client project during setup. One row per stage. Each insight has a stable key, which provisioning uses to update it in place.

| Stage | Insights |
| ----- | -------- |
| Attention | Unique visitors and page views by week. Visitors by channel type. Visitors by referring domain. Top landing pages. Visitors by device |
| Intent | `cta_clicked` by `cta_id`. `contact_link_clicked` by `channel`. `file_downloaded` by `file_name`. Share of page views reaching 75% scroll, by `page_type` |
| Action | Funnel: `$pageview` → `form_started` → `form_submitted`, split by `form_id`. `lead_submitted` by week. `form_abandoned` by `last_field`. `form_error_shown` by `field_name`. `lead_submitted` by `channel` *(new in v3)*. `lead_submitted` by `heard_about` *(new in v3)* |
| Consent | Sites with a banner only. Share of `$pageview` by `ad_consent`, by week *(v2)*. `consent_updated` by `advertising` *(v2)* |
| Revenue | Once they exist. `lead_qualified` count by month. `deal_won` count and value by month |

---

## Changing this list

1. Add, never rename. A replaced event keeps sending for one full reporting period beside its successor.
2. Add the new version to `versions` in `contract/events.json`, mark every addition with its `since`, run `pnpm run generate`, and freeze the version with `pnpm run freeze <version>`.
3. Add a changelog line: the version's `change` is it.
4. Release the package as a minor version. Each site adopts it through its Renovate pull request; the `taxonomy_version` property shows which sites are behind.

## Changelog

| Version | Date | Change |
| ------- | ---- | ------ |
| 1 | 2026-09-17 | First version |
| 2 | 2026-09-22 | Added `consent_updated` and the `ad_consent` super property, for sites with paid advertising. Nothing renamed or removed: a v1 site that moves to v2 without a banner changes only its `taxonomy_version` and starts sending `ad_consent: "unset"` |
| 3 | 2026-09-24 | Added `channel`, `utm_source`, `utm_medium`, `utm_campaign`, `referring_domain` and `heard_about` to `lead_submitted`, and `channel` to `lead_qualified` and `deal_won`, so the server-side lead count splits by where visitors came from. All optional: the server capture sends `channel: "unknown"` on a lead that has none. Nothing renamed or removed |
