## 1. Contract v3

- [ ] 1.1 Add version 3 to `contract/events.json`: the new `lead_submitted` properties, the optional `channel` on `lead_qualified` and `deal_won`, the channel and `heard_about` enums, the two dashboard insights and a changelog line. Freeze `contract/published/v3.json`. Verify that the v1 and v2 snapshot tests still pass, and that v3's differences are additions only.
- [ ] 1.2 Add `contract/channels.json` (design D4) and generate it into the contract. Verify with a generator test that an unknown key or a duplicate domain fails.
- [ ] 1.3 Regenerate, and commit `src/generated/` and `docs/events.md`. Verify that `generate:check` passes.

## 2. Classification

- [ ] 2.1 Implement `classifyChannel` in `/contract`. Verify with the fixture of about 40 cases: paid and organic search, paid and organic social, email, referral, `other_paid`, `{}` as `direct`, and `null` as `unknown`. Record in the fixture the PostHog channel type each case was checked against.

## 3. Browser

- [ ] 3.1 Record first touch in `sessionStorage` on `initAnalytics` (design D1), and export `attributionField()`. Verify with tests for each of these:
  - a UTM landing, then later pages, keeps the first touch
  - an internal referrer is ignored
  - `gclid` and `fbclid` are never stored
  - an objection or an empty key stores nothing
  - storage that throws gives an empty field
  - a direct landing stores `{}`
- [ ] 3.2 Measure the added gzipped bytes in the consumer fixture's eager chunk. Verify by recording them in the README.

## 4. Server

- [ ] 4.1 Implement `parseAttribution` (design D3). Verify with tests for each of these:
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
- [ ] 4.2 Test end to end: a parsed attribution passed to `createServerCapture` sends `lead_submitted` with the classified `channel`. Verify that no property carries a dropped value.

## 5. Skill and consumers

- [ ] 5.1 Edit the skill. Verify by rereading the diff in `~/.agents`, and commit there.
  - Change the decisions table's storage line (design D1).
  - Add a privacy-wording note for session attribution.
  - Add `heard_about` guidance for sites that ask the question.
- [ ] 5.2 Record the consumer follow-ups. Verify that each is in its repo's proposal:
  - luxury-gardens' `add-analytics`: send, parse and pass the attribution, v3, and the privacy wording
  - open-waters: the same in its contact handler
  - the analytics app's `adopt-the-contract-package`: the leads-by-channel metric, with v2 leads as "not recorded"

## 6. Release

- [ ] 6.1 Add the `1.1.0` changelog entry and bump the version. Hand the tag to Alex. Verify that Renovate opens a review-required pull request in each consumer.

## 7. The gate

- [ ] 7.1 Run `pnpm run ci:quality` and report its real output. Verify that it passes, with no task ticked on a failing run.
