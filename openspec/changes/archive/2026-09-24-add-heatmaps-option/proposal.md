# Add a heatmaps option

## Why

The package turns PostHog heatmaps off with no way to turn them on, because
the skill's reference code did (`capture_heatmaps: false`). But the skill does
not say heatmaps are always off. It says they are **"off by default"** and
**"decide per client"**, because aggregate click and scroll maps can fall
under the ICO's statistical purposes exception ("hits on sections of a page").

open-waters decided exactly that for its own site. Its pasted `analytics.ts`
sets `capture_heatmaps: true`, with the reasoning recorded in its AGENTS.md.
Diffed against the reference, that is its only site-specific setting. As the
package stands, open-waters cannot adopt it without losing a deliberate
decision. Its AGENTS.md now records the move as blocked on this change.

The package should enforce the default, not remove the choice.

## What Changes

- **`initAnalytics` gains an optional `heatmaps: boolean`.** It defaults to
  `false`, so every existing consumer behaves exactly as before. When `true`,
  PostHog is initialised with `capture_heatmaps: true`. Nothing else changes:
  cookieless mode, no person profiles, and replay off.
- **Heatmaps stay tied to the page loading after idle.** The option adds no
  eager code, and the setting only reaches PostHog through the existing
  dynamic import.
- **The documentation says what turning it on means.** The option's comment
  and the README state that heatmaps are per-client. The site's AGENTS.md must
  record why they are on, and that they are viewed in aggregate only. The
  skill already requires this. The option makes it a single visible line in a
  site's wiring, not an edited copy.
- **Provisioning learns the choice.** The analytics app's unapplied
  `add-provisioning` currently requires heatmaps off in every project, so it
  would flag, and on apply switch off, a site that opted in. It is revised to
  read a per-site `uses_heatmaps` flag from the registry.

**Not in this change:**

- Session replay. It needs consent, not an option, and stays off.
- Dead-click or rage-click capture.
- Any other PostHog setting a site might want. The rule is one option per
  decision the skill leaves to each client, and heatmaps is currently the only
  one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-capture`: the requirement that behaviour matches the skill's
  reference changes from "no heatmaps" to "no heatmaps unless the site opts
  in". A new requirement covers the option itself.

This delta modifies a capability introduced by `create-the-package`. That
change must be archived first, so that `openspec/specs/browser-capture/`
exists.

## Impact

- **Taxonomy:** v2 before and after. Heatmap data arrives as PostHog's own
  `$`-prefixed events, which the contract and the drift check ignore.
- **Package version:** the next minor, because it is a new optional API. If
  `split-leads-by-channel` ships first, this is 1.2.0, otherwise 1.1.0.
- **Consumers:**
  - **open-waters** is unblocked: it passes `heatmaps: true` when it moves to
    the package.
  - **luxury-gardens, radara and fionacorbett** change nothing, and keep the
    default. Renovate treats a minor release as review-only, but these sites
    need no code change to accept it.
  - **The analytics app:** `add-provisioning` is revised in the same change
    (planning only), as above.
  - **The skill:** the Next.js and Astro wiring shows the option, and the
    decisions table's heatmaps row names it.
- **Eager client bundle:** one conditional property, a handful of bytes,
  measured by `pnpm run measure`. `posthog-js`'s chunk is unchanged, because
  heatmap capture is part of what it already ships.
- **Outbound calls:** none new. When a site opts in, PostHog sends heatmap
  data through the same proxy host.
