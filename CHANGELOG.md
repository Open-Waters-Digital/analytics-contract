# Changelog

Package versions. The taxonomy (the event contract) has its own changelog in
[`docs/events.md`](docs/events.md).

## 1.0.0 — unreleased

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
