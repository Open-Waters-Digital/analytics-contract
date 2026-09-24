## 1. Contract v3

- [x] 1.1 Add version 3 to `contract/events.json`: the new `lead_submitted` properties, the optional `channel` on `lead_qualified` and `deal_won`, the channel and `heard_about` enums, the two dashboard insights and a changelog line. Freeze `contract/published/v3.json`. Verify that the v1 and v2 snapshot tests still pass, and that v3's differences are additions only.
  - v3 was frozen as `contract/published/v3.json`. Against v2 it adds eight properties, every one optional, and nothing else. The v1 and v2 snapshot tests pass.
- [x] 1.2 Add `contract/channels.json` (design D4) and generate it into the contract. Verify with a generator test that an unknown key or a duplicate domain fails.
  - `contract/channels.json` holds PostHog's source, medium and domain lists (24 September 2026). The validator names unknown keys, bad categories, non-lowercase values, and a source filed under two categories. A duplicate domain cannot exist once JSON is parsed (the last key wins), so a source in two categories is the check that matters.
- [x] 1.3 Regenerate, and commit `src/generated/` and `docs/events.md`. Verify that `generate:check` passes.
  - `src/generated/channels.ts` is added to the outputs and to the stale check. `generate:check` passes.

## 2. Classification

- [x] 2.1 Implement `classifyChannel` in `/contract`. Verify with the fixture of about 40 cases: paid and organic search, paid and organic social, email, referral, `other_paid`, `{}` as `direct`, and `null` as `unknown`. Record in the fixture the PostHog channel type each case was checked against.
  - 44 fixture cases plus normalisation and determinism, each noting PostHog's channel type. `ai` was added to the enum while applying, and the PostHog-to-ours mapping is recorded in design D4.

## 3. Browser

- [x] 3.1 Record first touch in `sessionStorage` on `initAnalytics` (design D1), and export `attributionField()`. Verify with tests for each of these:
  - a UTM landing, then later pages, keeps the first touch
  - an internal referrer is ignored
  - `gclid` and `fbclid` are never stored
  - an objection or an empty key stores nothing
  - storage that throws gives an empty field
  - a direct landing stores `{}`
  - Nine tests: first touch kept across page loads, hostname only, own site ignored, `{}` for a direct landing, no `gclid`/`fbclid`, 100-character cap, nothing stored when the visitor objected or there is no key, and `""` when storage is blocked. The parity stream is re-pinned to `taxonomy_version: "3"`, which is the only difference.
- [x] 3.2 Measure the added gzipped bytes in the consumer fixture's eager chunk. Verify by recording them in the README.
  - The eager entry went from 1,884 to 2,054 bytes gzipped (+170). The posthog-js chunk is unchanged. Recorded in the README and the changelog.

## 4. Server

- [x] 4.1 Implement `parseAttribution` (design D3). Verify with tests for each of these:
  - a valid payload
  - an email in a UTM value
  - a phone-length run of digits
  - over-long values
  - disallowed characters
  - a nested object, an array or a number
  - a body over 2 KB
  - invalid JSON
  - a referrer URL reduced to its hostname
  - a forged `channel` key being ignored
  - Checked on the raw value before cleaning, so an `@` is caught before the character filter would remove it. The digit rule ignores spaces (catching `07700 900123`) and stops at dashes (keeping `sale-2026-09-24`), a little stricter than "consecutive" and recorded in the code.
- [x] 4.1a In `createServerCapture`, send `channel: "unknown"` on `lead_submitted` when the caller passes none, and a passed channel unchanged (design D6). Verify with tests for both, and that no other event gains a channel.
  - Three tests: unknown when none is passed, a passed channel unchanged, and no channel added to other events.
- [x] 4.2 Test end to end: a parsed attribution passed to `createServerCapture` sends `lead_submitted` with the classified `channel`. Verify that no property carries a dropped value.
  - A payload with a phone number in the campaign and an extra `email` key reaches PostHog as `paid_social`, with the campaign dropped and neither value present.

## 5. Skill and consumers

- [x] 5.1 Edit the skill. Verify by rereading the diff in `~/.agents`, and commit there.
  - Change the decisions table's storage line (design D1).
  - Add a privacy-wording note for session attribution.
  - Add `heard_about` guidance for sites that ask the question.
  - `~/.agents` `d1ce34f`: the storage decision, the leads row, the privacy-page step, and a new "Leads by channel" section in implementation.md (wiring, never trust, unknown, channel list, `heard_about`).
- [x] 5.2 Record the consumer follow-ups. Verify that each is in its repo's proposal:
  - luxury-gardens' `add-analytics`: send, parse and pass the attribution, v3, and the privacy wording
  - open-waters: the same in its contact handler
  - the analytics app's `adopt-the-contract-package`: the leads-by-channel metric, with v2 leads as "not recorded"
  - luxury-gardens' `add-analytics` and the analytics app's `adopt-the-contract-package` now target `^1.2.0`, and both validate. open-waters' AGENTS.md follow-up names v3 and the attribution wiring. All uncommitted in those repos, like their other plans.

## 6. Release

- [x] 6.1 Add the `1.2.0` changelog entry and bump the version. Hand the tag to Alex. Verify that Renovate opens a review-required pull request in each consumer.
  - Version 1.2.0, with the changelog entry. The tag is with Alex. No repo uses the package yet, so the Renovate check has nothing to open a pull request in until luxury-gardens adopts it.

## 7. The gate

- [x] 7.1 Run `pnpm run ci:quality` and report its real output. Verify that it passes, with no task ticked on a failing run.

  - 2026-09-24, from a clean `dist/`: generated files current, lint and tsc clean, 9 files and 140 tests passed, Prettier clean, build done. Eager entry 2,054 bytes gzipped.