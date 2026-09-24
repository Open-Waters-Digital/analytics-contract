# Design: split leads by channel

## Context

Depends on `create-the-package` being applied. The package, the generator, the
frozen version snapshots and the four entry points all exist by then. The
motivation is in proposal.md, and the cookieless trade-offs are in
`create-the-package`'s design.

Two constraints shape this change:

- **Sites load pages in two ways.** Astro sites without view transitions do a
  full page load on every navigation, so nothing kept in memory survives from
  the landing page to the form. Next.js sites keep memory across client-side
  navigation, but not across a reload.
- **PostHog is loaded after idle, and may never load.** An ad blocker can block
  it, or the visitor can leave early. Attribution must not depend on PostHog
  having loaded. The lead is precisely the case where PostHog may be absent.

## Goals / Non-Goals

**Goals:**

- Every `lead_submitted` carries a channel.
- Attribution survives a full page load within the tab.
- Nothing is stored for an objecting visitor, or where analytics is dormant.

**Non-Goals:**

- Attribution across days or tabs.
- Last-touch attribution. First touch in the session is the question clients
  ask ("what brought them in").
- Any identifier.

## Decisions

### D1. First touch in `sessionStorage`

On `initAnalytics`, before PostHog loads, `/browser` checks
`sessionStorage["ow-attribution"]`. If it is absent, it writes
`{ utm_source, utm_medium, utm_campaign, referring_domain }` from the current
URL and `document.referrer`:

- The referrer is kept as a hostname, and only when it differs from the site's
  own host.
- An absent value is omitted.
- A page with no UTM values and no external referrer still writes an empty
  object. That records that the session began directly, and stops a later
  internal page from claiming first touch.

Its lifetime is the tab's: the browser clears it when the tab closes.

**Why this is within the statistical purposes exception.** Its sole purpose is
counting leads by channel in aggregate. It holds no identifier, and is never
sent anywhere except inside the lead's properties. The skill's decisions table
changes from "no cookies or browser storage" to "no cookies, no identifiers;
session storage for landing attribution only". Each site's privacy information
says the same.

- **Rejected: memory only.** It loses everything on a full page load, and so
  fails every Astro site.
- **Rejected: a cookie.** It would be sent to the server on every request,
  outlive the tab, and is the thing the baseline promises not to set.
- **Rejected: reading PostHog's session properties at submit time.** PostHog
  may not have loaded, which is exactly the case for a lead.
- **Rejected: carrying UTMs in the URL across pages.** It pollutes every
  internal link, and breaks the moment one link is hand-written.

### D2. What the form sends

`attributionField()` returns a JSON string. It is empty when the store is
unreadable, which is different from the store holding an empty object.

Sites send it as one field, `ow_attribution`:

- An enhanced form adds it to its JSON body.
- A native form gets a hidden input, filled on submit by the site's existing
  script. A form sent without JavaScript therefore sends nothing, and
  classifies as `unknown`, not `direct`. The difference matters when reading
  the numbers: `unknown` means "could not tell", while `direct` means "arrived
  with no source".

### D3. Parsing on the server

`parseAttribution(raw: unknown): Attribution | null` is hand-written, with no
Zod, so the package stays dependency-free:

- the input must be a string of at most 2 KB, and parse as JSON into a plain
  object
- only the four known keys are read, and each must be a string
- each value is normalised: lowercased, trimmed, cut to 100 characters, with
  anything outside `[a-z0-9._+\- ]` removed
- a value is dropped if it contains `@`, or a run of six or more digits
- `referring_domain` must parse as a hostname

A result with every value dropped is `{}`, which classifies as `direct`.
Anything else that fails is `null`, which is `unknown`.

- **Rejected: trusting the browser's classification.** The channel is computed
  on the server from parsed values. A forged `channel` field does nothing,
  because none is read.

### D4. The classification

`classifyChannel(attribution | null): Channel` lives in `/contract`.

- **A table of known source domains and aliases**: the search engines, the
  social networks and the email providers, taken from PostHog's channel type
  definitions at the time of writing. The table lives in
  `contract/channels.json`, beside the events, and is generated into the
  contract.
- **The medium decides paid versus organic.** `cpc`, `ppc`, `paid`,
  `paidsocial`, `paid_social` and similar mean paid. Everything else is
  organic.
- **Precedence:**
  1. an email medium
  2. a paid medium, split by whether the source is search or social, with
     `other_paid` otherwise
  3. a known search or social source, or referring domain, as organic
  4. an AI source or domain, as `ai`, before search, since some AI assistants
     live on a search engine's domain
  5. any other referring domain, or a referral or affiliate medium, as
     `referral`
  6. `{}` is `direct`, `null` is `unknown`, and tags that match nothing are
     `unknown`
- **Mapping PostHog's channel types onto ours** (settled while applying, from
  PostHog's `channel_type.py` and `channel_definitions.json`):

  | PostHog | Ours |
  | ------- | ---- |
  | Paid Search | `paid_search` |
  | Paid Social | `paid_social` |
  | Paid Video, Paid Shopping, Display, Cross Network, Paid Unknown | `other_paid` |
  | Direct | `direct` |
  | Email | `email` |
  | AI | `ai` |
  | Organic Search | `organic_search` |
  | Organic Social, Organic Video | `organic_social` |
  | Organic Shopping, Referral, Affiliate | `referral` |
  | SMS, Push, Audio, Unknown | `unknown` |

  Paid means a `utm_medium` of `cpc`, `cpm`, `cpv`, `cpa`, `ppc` or
  `retargeting`, or one starting `paid`, as PostHog's. PostHog also counts
  `gclid` and `gad_source`, which this package never stores (they are
  advertising identifiers), so a click with only a `gclid` classifies by its
  referrer instead. A known domain list is checked before the label match, so
  `gemini.google.com` is `ai` and not search.
- **A fixture test** asserts the result for about 40 source, medium and
  referrer cases. Each case's expected value is PostHog's channel type for the
  same inputs, mapped onto this list, as recorded when the table is written.

Adding a source to the table is a patch release, because it changes no
property.

### D5. `heard_about`

It is only a contract property with a fixed set of values. No code supports
it, because the question, its wording and its position in a form are each
site's own decision. A site maps its own answers onto the list on its server.

### D6. `channel` optional in the contract, filled by the server capture

The contract's own rule (spec `event-contract`, "Every version is kept") lets a
new version add only optional properties, and the generator enforces it. So
`channel` is optional on `lead_submitted` at v3, and the guarantee that every
lead carries one moves into `createServerCapture`: for `lead_submitted`, a
missing `channel` is sent as `"unknown"`.

- **Rejected: required, with the rule relaxed.** It would force every upgrading
  site to wire attribution before it compiles, but it also removes the rule
  that makes a taxonomy upgrade safe to review rather than a breaking change,
  for every future version, to serve one property.
- "unknown" is honest: it already means "could not tell", which is what a site
  that has not wired attribution is.

## Risks / Trade-offs

- **[First touch in the session is not the true first touch.]** A multi-day
  journey credits its last session's landing. → This is inherent to cookieless
  mode. It is stated in every report beside the channel split, and `heard_about`
  exists for exactly this.
- **[PostHog's channel rules change.]** → The fixture records what they were. A
  divergence is a patch release that updates the table.
- **[Session storage is a change to the baseline's promise.]** → The skill edit
  and each site's privacy wording land with the site's adoption, not later.

## Migration Plan

Release as `1.2.0`. Each site adopts v3 in a reviewed pull request that makes
three changes:

1. the form sends `ow_attribution`
2. the route parses it and passes it to `lead_submitted`
3. the privacy wording is updated

Until a site adopts it, it keeps sending v2 leads without a channel. The
analytics app groups those as "not recorded" rather than "unknown".
