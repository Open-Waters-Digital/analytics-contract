# Changelog

Package versions. The taxonomy (the event contract) has its own changelog in
[`docs/events.md`](docs/events.md).

## 1.1.0 — unreleased

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
