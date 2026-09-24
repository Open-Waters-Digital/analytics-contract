# Split leads by channel

## Why

`lead_submitted` is the number reported to every client. It comes from the
server, so ad blockers cannot reduce it. It also carries a random distinct id
by design, so it cannot be split by channel.

The first question a client asks about their leads is "where did they come
from?". Today only the browser's `form_submitted` can answer it, because it
shares a session with the page views that carry the UTM tags. But
`form_submitted` loses whatever ad blockers and failed scripts lose, and it
reads high from bots that were answered with a success. So the reliable number
cannot answer the question, and the number that can answer it is not reliable.

Cookieless mode makes this worse for any client whose customers take time to
decide (see `create-the-package`, design, "What cookieless mode costs"). A
visitor who lands from a campaign on Monday and enquires on Thursday is two
unrelated visitors. The self-reported answer is often more accurate than any
automatic attribution for that kind of client.

This is the second weakness from the review recorded in `create-the-package`.

## What Changes

- **Taxonomy v3.**
  - `lead_submitted` gains `channel`, and optional `utm_source`,
    `utm_medium`, `utm_campaign`, `referring_domain` and `heard_about`.
  - `lead_qualified` and `deal_won` gain an optional `channel`, so a site that
    stores the channel with the enquiry can carry it up the ladder later.
  - Nothing is renamed or removed.
  - `channel` is optional in the contract, because a new version only adds
    optional properties (spec `event-contract`), so no caller fails to compile
    on upgrade. The server capture fills `channel: "unknown"` when a site passes
    none, so every v3 lead still carries one, and a site that has not wired the
    attribution shows up as "unknown" rather than missing. Decided while
    applying, 24 September 2026, over relaxing the contract's rule.
- **Landing attribution in the browser.**
  - On the first page of a tab's session, `/browser` records the UTM source,
    medium and campaign, and the referring domain. Only the hostname is kept,
    and only when it is external.
  - It keeps this first touch in `sessionStorage` under `ow-attribution`, which
    the browser clears when the tab closes. It is only written when analytics
    is live and the visitor has not objected.
  - `attributionField()` gives a site's form code a value to send with the
    submission.
- **A shared channel classification.**
  - `classifyChannel()` in `/contract` maps attribution to one of:
    - `direct`
    - `organic_search`
    - `paid_search`
    - `organic_social`
    - `paid_social`
    - `email`
    - `ai`, for ChatGPT, Claude, Perplexity and the like, as PostHog's own
      "AI" channel (added while applying, 24 September 2026)
    - `referral`
    - `other_paid`
    - `unknown`
  - The rules follow PostHog's own channel types, so that a lead's channel
    agrees with the web analytics channel for the same visit.
  - The function is shared, so every client classifies identically, and the
    analytics app can use it as well.
- **Parsing on the server.** `/server` exports `parseAttribution(unknown)`,
  which never trusts what the browser sent:
  - it lowercases and trims values, and truncates them to 100 characters
  - it keeps only a safe set of characters
  - it drops any value containing `@` or a long run of digits, because a UTM
    parameter is a URL anyone can craft
  - it returns `null` for anything malformed, and a lead with no attribution is
    `channel: "unknown"`
- **`heard_about`, a standard self-reported answer.** A fixed list of values:
  - `search_engine`
  - `social_media`
  - `recommendation`
  - `directory`
  - `press`
  - `event`
  - `returning_client`
  - `other`

  It is optional, because asking the question is each site's decision. When a
  site asks it, the answers compare across clients.
- **The baseline dashboard** gains "`lead_submitted` by `channel`" and
  "`lead_submitted` by `heard_about`".

**Not in this change:**

- Multi-touch or cross-day attribution. Cookieless mode rules it out, and this
  change does not work around that.
- Click identifiers (`gclid`, `fbclid` and similar). These are advertising
  identifiers, and storing them in the baseline would tie it to advertising,
  which the statistical purposes exception forbids.
- Adding the question to any site's form. That is each site's own proposal.

## Capabilities

### New Capabilities

- `lead-attribution`: recording landing attribution, classifying channels,
  parsing attribution on the server, and the v3 properties on leads.

### Modified Capabilities

None. `event-contract`, `browser-capture` and `server-capture` are unchanged in
what they require: v3 only adds optional properties, as `event-contract`
already allows. This change's requirements are a new capability.

## Impact

- **Taxonomy:** 2 → 3. Package: 1.1.x → `1.2.0` (1.1.0 went to the heatmaps option), a minor release, reviewed in
  every consumer.
- **Storage:** the first browser storage the baseline writes, apart from an
  objection. It is session-scoped, holds no identifier, and is written for a
  statistical purpose only. The skill's decisions table and each site's
  privacy information must say so. That is a skill edit in the same change.
- **Consumers:**
  - **luxury-gardens:** the consultation form sends `attributionField()`, and
    the enquiry route parses it and passes it to `lead_submitted`. This is
    folded into `add-analytics`, which targets v3 once this ships.
  - **open-waters:** the same, in its contact form handler.
  - **analytics app:** a "leads by channel" snapshot metric. It is folded into
    `adopt-the-contract-package`.
- **Client bundle:** a few hundred bytes gzipped in `/browser`, to be measured.
  `classifyChannel` is not bundled unless a site imports `/contract` in the
  browser, which none needs to.
- **Outbound calls:** none new.
