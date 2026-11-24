# Add AI assistants as a lead source

## Why

`heard_about` cannot record the answer clients most want to see now: "an AI assistant told me". Visitors who ask ChatGPT or Perplexity for an agency often arrive with no referrer. The browser's `channel: ai` misses them, so the visitor's own answer is the only record.

Open Waters' own enquiry form is adding the question first (open-waters change `step-the-enquiry-form`, 21 November 2026). It also asks which assistant, and which search engine for a search. Those answers compare across clients only if the contract fixes their values.

## What Changes

- **Taxonomy v4.** On `lead_submitted`:
  - `heard_about` gains the value `ai_assistant`.
  - New optional `ai_tool`: one of `chatgpt`, `claude`, `gemini`, `perplexity`, `copilot` or `other`. Sent only with `heard_about: ai_assistant`.
  - New optional `search_engine`: one of `google`, `bing`, `duckduckgo`, `ecosia` or `other`. Sent only with `heard_about: search_engine`.
  - Nothing is renamed or removed. Every v1 to v3 event and property resolves exactly as published.
- **Enum values carry their own `since`.**
  - Today an enum's values are unversioned. Adding `ai_assistant` to `heard_about` would therefore change v3's resolved contract and break its frozen snapshot.
  - Enum values may now be written as `{ "value": "ai_assistant", "since": 4 }` beside plain strings (a plain string means the property's own `since`), as page types already are.
  - Each version resolves only the values it had.
  - `event-contract` changes to allow a new version to add values to an existing optional property's set. That widens what a consumer may send, and never narrows it.
- **No typed text, by type.**
  - What the visitor asked the assistant, or searched for, has no property, and the types admit none.
  - `docs/events.md` says so beside the two new properties, as it already does for `heard_about`.
- **The baseline dashboard** gains "`lead_submitted` by `ai_tool`" and "`lead_submitted` by `search_engine`", monthly, as `heard_about` is.
- **Versions.** The taxonomy goes from 3 to 4, and the package from 1.2.1 (unreleased) to **1.3.0**, a minor release. The 1.2.1 fix ships in it if 1.2.1 has not been tagged by then.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-contract`:
  - a new version may add values to an existing optional property's enum, each value marked with the version that added it;
  - an old version resolves without them.
- `lead-attribution`:
  - v4's `heard_about` value and the two new properties;
  - the rule that they are sent only with their `heard_about` answer;
  - the two dashboard insights.

## Impact

- **Taxonomy:** 3 → 4. **Package:** 1.2.1 → 1.3.0.
- **Consumers:**
  - **open-waters:** adopts in `step-the-enquiry-form`, by deleting its v3 mapping (`ai_assistant` → `other`) and sending `ai_tool` and `search_engine`. The Renovate pull request is reviewed, not merged unattended (a minor release).
  - **luxury-gardens, radara, femtech:** nothing to change. Their Renovate pull requests are reviewed as for any minor release. A site that lists `heard_about` values with `satisfies` keeps compiling, because the type only widens.
  - **The analytics app (`../analytics`):**
    - "Leads by how they heard" shows `ai_assistant` with no code change, because it breaks down by whatever value arrives.
    - Snapshot metrics for leads by `ai_tool` and by `search_engine`, and their labels, are a follow-up proposal there.
    - Its drift check reads v4 from the contract export once it bumps the package.
  - **The `openwaters-analytics` skill:** the `heard_about` guidance gains the AI follow-ups and the no-typed-text rule for them. It is edited in the same change.
- **Client bundle:** none. The change is to types, the contract export and docs. `/browser` is unchanged: 0 bytes added to a consumer's eager bundle, to be confirmed by `measure-bundle`.
- **Outbound calls:** none new.

## Out of scope

- Classifying AI referrers differently. `channel: ai` already exists and is unchanged.
- Any property for the prompt or search term. These are typed text and personal-data risks, so they stay in each site's own store.
- The analytics app's new metrics, which are its own proposal.
