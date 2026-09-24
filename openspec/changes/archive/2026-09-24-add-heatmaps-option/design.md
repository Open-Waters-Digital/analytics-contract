# Design: add a heatmaps option

## Context

- `src/browser.ts` passes a fixed option set to `posthog.init`, including
  `capture_heatmaps: false`. The options come from the skill's reference, and
  the parity test pins them (`EXPECTED_CONFIG` in `test/parity/scenario.ts`).
- open-waters' pasted copy differs from the v2 reference only in
  `capture_heatmaps: true` and its v1 taxonomy. That was checked by diffing the
  two on 23 September 2026.
- The skill: heatmaps are "off by default", may fall under the statistical
  purposes exception as aggregate data, and are "decided per client, and
  recorded why". Replay is different in kind: it always needs consent.
- The analytics app's `add-provisioning` (proposed, not applied) requires every
  project to have heatmaps off.

## Goals / Non-Goals

**Goals:**

- A site can opt into heatmaps with one visible line in its wiring.
- The default is unchanged for every existing consumer.
- Provisioning agrees with the site's choice, not against it.

**Non-Goals:**

- A general way to pass PostHog options.
- Replay, dead clicks and rage clicks.
- Deciding for any client whether heatmaps suit them. That is the skill's
  process, and the site's AGENTS.md records the answer.

## Decisions

### D1. One named boolean, not a passthrough

`AnalyticsConfig` gains `heatmaps?: boolean`, and `posthog.init` receives
`capture_heatmaps: config.heatmaps === true`.

- **Rejected: a `posthogOptions` passthrough.** It would let a site switch off
  cookieless mode or turn on replay with one line. The package exists to make
  those impossible, not merely discouraged. Each choice the skill leaves to a
  client gets its own named option. Heatmaps is the only one today.
- **Rejected: a `features: { heatmaps }` object.** It is structure for options
  that do not exist. A second option can be added beside this one.
- **`=== true`, not truthiness.** Astro and Next consumers often read settings
  from environment variables, and `"false"` is a truthy string. Only a real
  `true` turns heatmaps on.

### D2. Regulated sites may opt in, and masking still applies

`heatmaps` and `regulated` are independent. With both set, PostHog captures
click positions with element text and attributes masked, as `regulated`
already requires of autocapture.

- **Rejected: refusing heatmaps when `regulated` is true.** The skill leaves a
  regulated client's rules to that site's AGENTS.md ("the site's own
  `AGENTS.md` privacy rules override anything here"). A code-level refusal
  would be the package making a legal call the skill deliberately leaves to the
  client. Radara's AGENTS.md is where "no heatmaps" belongs, if its adviser
  says so.

### D3. The client option decides, and the project setting follows it

PostHog has a project-level heatmaps setting as well as the client's
`capture_heatmaps`. The package already sets the client option explicitly
either way, so the project setting cannot switch heatmaps on behind a site's
back. The apply task confirms, from posthog-js's source, that an explicit
`capture_heatmaps` wins over the remote project setting in 1.433.

Provisioning should still keep the project setting in step, so the project's
own view of heatmaps does not contradict the site. `add-provisioning` is
therefore revised:

- sites gain `uses_heatmaps` (boolean, default false)
- the required project setting follows it
- the site form gets a checkbox

open-waters is marked true.

### D4. Tests

The parity scenario is unchanged: it runs the default, and the default must
still equal the reference. The option gets package-only tests:

- the init options with the option absent, false, true and the string
  `"true"` passed through a loose cast
- the objection and empty-key cases capturing nothing with `heatmaps: true`
- `regulated` with `heatmaps` keeping masking on

## Risks / Trade-offs

- **[A site turns heatmaps on without the decision being recorded.]** → The
  option's comment, the README and the skill all say the AGENTS.md record is
  required. The drift check cannot see heatmaps (`$`-prefixed), so this relies
  on review, which the minor-release review in the consumer also prompts.
- **[PostHog changes how the project setting and `capture_heatmaps`
  interact.]** → The confirmation is recorded in the code with the posthog-js
  version it was checked against. A peer range bump re-checks it.

## Migration Plan

Release as the next minor.

1. open-waters adopts the package with `heatmaps: true`, in its own proposal.
2. The analytics app marks open-waters `uses_heatmaps` when provisioning ships.
3. No other site changes.

**Rollback:** consumers pin the previous version. A site that opted in loses
heatmaps until it moves forward again.
