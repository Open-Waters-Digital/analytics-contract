# Design

## Context

`scripts/contract-source.ts` resolves each taxonomy version from `contract/events.json` by filtering events, properties, super properties, page types and dashboard insights on their `since`.

Enum values have no `since`: `{ "enum": [...] }` is a plain list. A value added to `heard_about` would therefore appear in v3's resolution and fail `v3 still resolves exactly to its snapshot`. Page types already solve the same problem with `{ value, since }` entries.

## Goals / Non-Goals

**Goals:**
- Widen an existing enum in a new version without editing a published one.
- `ai_tool` and `search_engine` as ordinary optional enum properties.

**Non-Goals:**
- Narrowing or reordering values. Order in the resolved list stays the source's order.
- Versioning anything else at value level.

## Decisions

### D1. Mixed enum entries

An enum's values may be a string or `{ "value": string, "since": number }`.

- A plain string inherits the property's `since`.
- Validation checks that a value's `since` is no earlier than its property's, and no later than the current version. It names the value on failure.
- `resolveVersion` filters values by `since`. Published JSON snapshots keep plain string lists, so v1 to v3 snapshots do not change shape.

Alternative considered: a new property, `heard_about_v4`. Rejected, because it splits one question's answers across two breakdowns in every report.

### D2. Drop a mismatched follow-up in the server capture

`createServerCapture` removes `ai_tool` unless `heard_about === "ai_assistant"`, and `search_engine` unless `heard_about === "search_engine"`. This is the same place it fills `channel: "unknown"` (v3, D6).

The rule lives in code rather than only in docs, so a report never shows "Google" against a recommendation. It never throws.

Alternative considered: encode the rule in the types (a discriminated union). Rejected, because the generator emits flat property types and a union would be a generator rewrite for two properties.

### D3. Generated types widen only

The current-version `ServerEvents['lead_submitted']['heard_about']` gains `"ai_assistant"`. A consumer's `satisfies readonly HeardAbout[]` list keeps compiling.

A consumer with `Record<HeardAbout, string>` labels must add one label. That is a type error in its Renovate pull request, which is reviewed anyway for a minor release. No current consumer has one (checked 21 November 2026: open-waters's labels are its own list; the analytics app breaks down by raw value).

### D4. Dashboard insights

Two insights:
- `action.lead_submitted_by_ai_tool`
- `action.lead_submitted_by_search_engine`

Both are `since: 4`, trend, monthly, with an event-scoped breakdown, copied from `action.lead_submitted_by_heard_about`.

## Risks / Trade-offs

- [The tool list dates fast: a new assistant becomes popular] → `other` catches it. Adding a value later is exactly what D1 makes possible, in a v5.
- [Sites map their wording wrongly onto the values] → The docs list each value's meaning. The skill's guidance says which wording maps to which value.
- [Generator change touches every version's resolution] → The frozen v1 to v3 snapshot tests pin it. Tasks add a fixture with a value-level `since`.

## Migration Plan

1. Edit the source, generate, and freeze `contract/published/v4.json`.
2. Release 1.3.0 by tag.
3. Consumers adopt through Renovate.
4. Rollback: consumers pin 1.2.x. A published version is never edited.
