# Changelog

Package versions. The taxonomy (the event contract) has its own changelog in
[`docs/events.md`](docs/events.md).

## 1.3.0 — unreleased

Taxonomy v4: an AI assistant as a lead source.

- `lead_submitted`'s `heard_about` gains `ai_assistant`. Two optional
  properties say which: `ai_tool` (`chatgpt`, `claude`, `gemini`,
  `perplexity`, `copilot`, `other`), sent only with
  `heard_about: "ai_assistant"`, and `search_engine` (`google`, `bing`,
  `duckduckgo`, `ecosia`, `other`), sent only with
  `heard_about: "search_engine"`. No property can hold the prompt or the
  search itself.
- `/server`: `createServerCapture` drops `ai_tool` or `search_engine` from a
  `lead_submitted` whose `heard_about` is not its answer, or is missing.
  Other events are untouched.
- The contract's enum values may carry their own `since`, so a version can
  add values to an existing optional property and every older version still
  resolves exactly as published. v1 to v3 are unchanged; `contract/published/v4.json`
  is frozen.
- The baseline dashboard gains `lead_submitted` by `ai_tool` and by
  `search_engine`, monthly.
- Types only widen: a site's `heard_about` list keeps compiling. A site with a
  `Record` over every `heard_about` value needs a label for `ai_assistant`.
- The eager `/browser` entry is unchanged.

## 1.2.1 — 2026-11-09

A fix; no event, property or API changes.

- `cta_text` skips text inside `aria-hidden="true"`. A control that animates
  its label (femtech's rolling label) draws decorative copies beside one
  readable copy, and the package sent all of them: "Sign UpSign UpSign Up".
  It now sends what a screen reader reads, and still falls back to
  `aria-label` when nothing is readable.
- The eager `/browser` entry is 2,130 bytes gzipped, 76 more than 1.2.0.

## 1.2.0 — 2026-09-24

Taxonomy v3: the server-side lead count splits by channel.

- `lead_submitted` gains `channel`, `utm_source`, `utm_medium`, `utm_campaign`,
  `referring_domain` and `heard_about`. `lead_qualified` and `deal_won` gain
  `channel`. All are optional, as a new version's properties must be, so
  nothing fails to compile on upgrade.
- `/browser` keeps the tab's first touch (UTM tags and the referring hostname)
  in session storage, from the landing page, only while analytics is live and
  the visitor has not objected. `attributionField()` gives a form the value to
  send.
- `/server` adds `parseAttribution`, which trusts nothing: values that look
  like an email address or a phone number are dropped, and anything malformed
  is `null`. The capture sends `channel: "unknown"` on any `lead_submitted`
  that passes none.
- `/contract` adds `classifyChannel`, which follows PostHog's channel types
  mapped onto `direct`, `organic_search`, `paid_search`, `organic_social`,
  `paid_social`, `email`, `ai`, `referral`, `other_paid` and `unknown`, from
  `contract/channels.json`.
- The baseline dashboard gains `lead_submitted` by `channel` and by
  `heard_about`.
- The eager `/browser` entry is 2,054 bytes gzipped, 170 more than 1.1.0.

## 1.1.0 — 2026-09-24

Still taxonomy v2.

- `initAnalytics` takes an optional `heatmaps: boolean`. It is off unless it is
  exactly `true`, so every existing site behaves as before. It is for clients
  that have decided on aggregate heatmaps. open-waters is one, and it could not
  move to the package without this.
- The package always sets `capture_heatmaps`. posthog-js reads the project's
  heatmaps setting only when the option is unset, so the project cannot switch
  heatmaps on behind a site's back.
- The eager `/browser` entry is 1,884 bytes gzipped, 5 more than 1.0.0.

## 1.0.0 — 2026-09-23

First release, at taxonomy v2. Replaces the code the `openwaters-analytics`
skill carried for sites to copy.

- `/browser`, `/server`, `/consent` and `/contract` entry points.
- The contract is generated from `contract/events.json`, with taxonomy versions
  1 and 2 frozen.
- Behaviour matches the skill's reference code, with these differences:
  - The site slug is an option (`initAnalytics({ site })`,
    `createServerCapture({ site })`) instead of a constant edited into the file.
  - Server capture times out each request after five seconds, and resolves
    within five seconds overall. The reference had no timeout.
  - Consent: a choice that cannot be stored no longer runs consent-gated code.
  - Consent: withdrawal clears platform cookies on every parent domain. The
    reference missed `.example.co.uk`, where the platforms set them, on every
    `.co.uk` site.
