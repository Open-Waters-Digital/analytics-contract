# Create the package

## Why

Open Waters tracks every client site with one shared contract: the same events,
the same properties and the same PostHog conventions, all defined in the
`openwaters-analytics` skill. The design is sound, and design.md records the
review that confirmed it.

**Its weak point is distribution.** The contract exists as three copies:

- the skill's `events.md` and its reference code
- the analytics app's `src/lib/event-list.ts`
- each site's pasted `analytics.ts`

Only the app's copy is pinned by a test, and each site's copy can only be
checked by eye.

Both problems have already happened, in the conversation this change records:

- A server-timeout fix, needed for Luxury Gardens, has to be carried to every
  site by hand.
- Taxonomy v2 (22 September 2026) means editing every site's pasted file and the
  app's mirror.

With four sites that is tedious. At fifteen it becomes silent divergence, which
is exactly what the drift check exists to catch.

**Now is the cheapest moment.** Only open-waters runs the contract so far.
Luxury Gardens has a proposal (`add-analytics`) that has not been applied, and
could start on the package rather than a copy.

## What Changes

- **A new private package, `@open-waters-digital/analytics`**, in its own repo
  (`Open-Waters-Digital/analytics-contract`) and published to GitHub Packages.
  - GitHub Packages requires the scope to match the organisation, which is why
    it is not `@openwaters/analytics`.
  - Its own repo, because client sites should not depend on an internal app's
    releases, and publishing should never trigger an app deploy.
- **`contract/events.json` becomes the single source of the contract**, at
  taxonomy v2, the current version. It holds:
  - every taxonomy version's events, each with its stage, origin and typed
    properties
  - the super properties
  - the page types
  - the changelog

  `src/generated/` (types, version constants) and `docs/events.md` are
  generated from it. CI fails if a generated file is stale.
- **Four entry points**, so a site bundles only what it imports:

  | Entry point | Holds | Loads |
  | ----------- | ----- | ----- |
  | `/browser` | The skill's `analytics.ts`, with the site slug passed to `initAnalytics` rather than edited into a constant | `posthog-js`, through a dynamic import only |
  | `/server` | `captureServerEvent`, now with a request timeout | `posthog-node` |
  | `/consent` | The consent store from the skill's `advertising.md` | Nothing extra |
  | `/contract` | Event lists for every version, page types and `TAXONOMY_VERSION`, for the analytics app | Nothing at runtime |

  `posthog-js` and `posthog-node` are optional peer dependencies. A site
  without a form handler never installs `posthog-node`.
- **Behaviour is unchanged from the skill's reference code at v2**, apart from
  two things:
  - the timeout on server capture
  - the site slug, which becomes a parameter
- **Releases by tag.** Pushing `v1.0.0` runs CI and publishes with the
  workflow's `GITHUB_TOKEN`. Versions are set by hand, with semver mapped to the
  contract as AGENTS.md sets out: a new taxonomy version is a minor release.
- **Renovate on every consumer.**
  - A shared preset in this repo, `renovate/default.json`, auto-merges patch
    releases of this package once CI passes, and groups other dependency
    updates weekly.
  - Each consumer's `renovate.json` extends it.
  - Installing the Renovate GitHub App on the organisation is a manual step for
    Alex.
- **The skill stops carrying code.** `implementation.md` and `advertising.md`
  keep their wiring and reasoning, but swap their pasted modules for imports
  from the package. `events.md` becomes a pointer to the package's generated
  `docs/events.md`, which ships inside the package, so any consuming repo has
  it at `node_modules/@open-waters-digital/analytics/docs/events.md`.
- **Consumer set-up, documented in the README:**
  - an `.npmrc` scope line
  - a read token in CI and in the Railway build
  - a Docker pattern that keeps the token out of the final image

## Capabilities

### New Capabilities

- `event-contract`: the versioned event list as a single source, what is
  generated from it, and the guarantees each version keeps.
- `browser-capture`: loading PostHog, the automatic listeners, the typed
  `track`, the objection control and the form helpers.
- `server-capture`: sending server events without ever failing or delaying the
  caller.
- `consent-store`: recording, reading and withdrawing consent for sites with a
  banner.
- `distribution`: publishing, versioning and how consumers receive updates.

### Modified Capabilities

None. This repo has no specs yet.

## Impact

- **Taxonomy:** v2 before and after. Package: `1.0.0`.
- **Consumers:**
  - **open-waters:** moves from its pasted copy to the package. Its copy
    predates v2, so it moves to v2 at the same time. This is a reviewed pull
    request, not unattended.
  - **luxury-gardens:** `add-analytics` is revised to install the package
    instead of copying. It has not been applied, so nothing is migrated.
  - **analytics app:** replaces `src/lib/event-list.ts` and its pinning test
    with the `/contract` export, in its own proposal (`adopt-the-contract-package`).
  - **radara and fionacorbett:** adopt the package when they are next worked on.
    Neither runs the contract yet.
  - **The skill:** edited in the same change, as above.
- **Client bundle:** unchanged from the pasted reference, which is the same
  code. The eager `/browser` module is measured at release and recorded in the
  README. `posthog-js` stays a separate chunk.
- **Secrets:**
  - One new kind: a GitHub token with `read:packages`, needed by every
    consumer's CI and Docker build to install.
  - It gives read access to private packages, not to code.
  - It must never be baked into an image, and design D6 covers how.
- **Outbound calls:** none new. The server helper's call to PostHog gains a
  timeout.
