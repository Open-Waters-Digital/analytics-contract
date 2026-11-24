# Spec Delta

## ADDED Requirements

### Requirement: Taxonomy v4 lead properties

Taxonomy v4 SHALL add the value `ai_assistant` to `lead_submitted`'s
`heard_about`, and two optional properties to `lead_submitted`: `ai_tool`,
one of `chatgpt`, `claude`, `gemini`, `perplexity`, `copilot` or `other`; and
`search_engine`, one of `google`, `bing`, `duckduckgo`, `ecosia` or `other`.
Every version 1 to 3 event, property and value SHALL be unchanged.

#### Scenario: Types in a consumer

- **WHEN** a consumer on v4 sends `lead_submitted` with `ai_tool: "perplexity"`
- **THEN** it type checks, and `ai_tool: "askjeeves"` does not

#### Scenario: Version 3 intact

- **WHEN** the contract export is read for version 3
- **THEN** `lead_submitted` has no `ai_tool` or `search_engine`, and
  `heard_about` has no `ai_assistant`

### Requirement: Follow-ups go with their answer

The documentation SHALL say that `ai_tool` is sent only with `heard_about:
ai_assistant` and `search_engine` only with `heard_about: search_engine`, and
the server capture SHALL drop either when it arrives with any other
`heard_about`, or with none.

#### Scenario: Mismatched follow-up

- **WHEN** a site sends `lead_submitted` with `heard_about: "recommendation"`
  and `search_engine: "google"`
- **THEN** PostHog receives the event without `search_engine`

#### Scenario: Matched follow-up

- **WHEN** a site sends `heard_about: "ai_assistant"` and `ai_tool: "claude"`
- **THEN** PostHog receives both

### Requirement: No typed text about the source

The contract SHALL define no property for what a visitor asked an assistant
or searched for, and the documentation SHALL say these stay in the site's own
store.

#### Scenario: Reading the docs

- **WHEN** a developer reads `ai_tool` in `docs/events.md`
- **THEN** it says the prompt itself is never sent

### Requirement: The dashboard shows leads by assistant and search engine

The baseline dashboard definition SHALL include, from version 4,
`lead_submitted` broken down by `ai_tool`, and by `search_engine`, monthly.

#### Scenario: A provisioned project

- **WHEN** the baseline dashboard is created from the definition at v4
- **THEN** it contains both insights, and at v3 it contains neither
