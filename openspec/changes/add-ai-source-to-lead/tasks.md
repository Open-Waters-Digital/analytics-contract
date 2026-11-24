# Tasks

## 1. Versioned enum values

- [x] 1.1 In `scripts/contract-source.ts`:
  - accept `{ value, since }` entries in an enum beside strings;
  - validate them (`since` no earlier than the property's, no later than current; unique values);
  - filter them in `resolveVersion`.

  Verify: a `contract.test.ts` fixture with a value added at a later version resolves without it at the earlier one. A value marked earlier than its property fails generation, naming it. The v1 to v3 snapshot tests still pass.

## 2. Contract v4

- [x] 2.1 In `contract/events.json`:
  - add version 4 and its `change` line;
  - add `{ "value": "ai_assistant", "since": 4 }` to `heard_about`;
  - add `ai_tool` and `search_engine` (`since: 4`, optional), with docs saying when each is sent and that the prompt or search is never sent;
  - add the two dashboard insights.

  Run `pnpm run generate` and `pnpm run freeze 4`. Verify: `generate:check` passes, `v4.json` is committed, and against v3 it adds one value, two properties and two insights only.
- [x] 2.2 Type tests (`test/types.test.ts`):
  - `ai_tool: "perplexity"` compiles on `lead_submitted`;
  - `"askjeeves"` does not;
  - `heard_about: "ai_assistant"` compiles.

  Verify: `pnpm test`.

## 3. Server capture

- [x] 3.1 `createServerCapture` drops `ai_tool` unless `heard_about` is `ai_assistant`, and `search_engine` unless it is `search_engine` (design D2).

  Verify: `server.test.ts` covers the matched case (both sent), mismatched (dropped), no `heard_about` (dropped), and no other event touched.

## 4. Docs, skill and consumers

- [x] 4.1 Add a CHANGELOG entry for 1.3.0 and bump the package version. Update AGENTS.md's "Released" line.

  Verify: `check-release-tag.sh` agrees with `package.json`.
- [x] 4.2 Skill `~/.agents/skills/openwaters-analytics`: the `heard_about` guidance gains `ai_assistant`, the two follow-ups, when to send them, and that the prompt and search term stay in the site's store.

  Verify: by rereading the diff, then commit there. (Edited in `references/implementation.md`; the commit in `~/.agents` is left to the user.)
- [ ] 4.3 Record the consumer follow-ups:
  - open-waters `step-the-enquiry-form`: delete the v3 mapping and send the follow-ups (already listed there);
  - the analytics app: a proposal for leads-by-`ai_tool` and leads-by-`search_engine` snapshot metrics, and their labels.

  Verify: each named in its repo. (open-waters: named in `step-the-enquiry-form`'s proposal, design and tasks. The analytics app: not yet; its proposal is still to write.)

## 5. Definition of done

- [x] 5.1 `pnpm run ci:quality` passes, including `measure-bundle` showing no change to the eager `/browser` entry. Report the real output.
- [x] 5.2 AGENTS.md swept.

## Workflow follow-up

- Tag `v1.3.0` to release, then archive this change.
