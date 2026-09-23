# Design: create the package

## Context

This is the first change in this repository. The Context section is therefore
also the record of the discussion that led to it (22 September 2026, while
proposing analytics for Luxury Gardens). It sets out how the shared analytics
works, why it is built this way, what it costs, and what the review of it
concluded. Later changes can point here, not repeat it.

### How the shared analytics works

- **One PostHog organisation per client, owned by the client.** Open Waters is
  invited as an admin. The client's data and billing are theirs, and they keep
  both if they leave.
- **Every site sends the same events** — the contract, versioned as the
  taxonomy. It is organised by the Digital Dividend ladder:
  - Attention: page views, time on page
  - Intent: CTA clicks, contact links, downloads, outbound links, scroll depth
  - Action: the form funnel, and `lead_submitted` from the server
  - Revenue: qualified leads and won deals, reported by the client
  - Consent, from v2: sites with a banner only

  Every event carries the site, the taxonomy version and the page type. The
  page type lets pages be compared across clients whose URLs have nothing in
  common.
- **The analytics app reads every client.** Each night it pulls aggregates from
  each client's PostHog through a read-only key. It checks each site for drift:
  unknown event names, and listed events that stopped arriving. It shows
  everything on one overview, and will later draft the monthly report from one
  template.

**The benefits:**

- numbers that compare across clients
- one report template
- broken tracking caught the next day
- a lead count that ad blockers cannot reduce
- client ownership
- no cookie banner for the baseline

### Why the design choices are the right ones

- **Cookieless mode (`cookieless_mode: "always"`).** No cookies and no browser
  storage. Visitors are counted by a server-side hash of IP, user agent and a
  salt that rotates daily. The legal basis is the ICO's statistical purposes
  exception (final guidance, 29 April 2026), not the absence of cookies. It
  holds only while all of these are true:
  - the purpose is aggregate statistics
  - visitors are told about it
  - there is a free and simple way to object
  - PostHog acts as a processor
  - no data is used for advertising
- **Leads counted server-side.** `lead_submitted` is sent by the form handler
  once the enquiry is delivered. So the number the client cares about most does
  not depend on the visitor's browser.
- **Managed reverse proxy** on a neutral subdomain of the client's domain, so ad
  blockers do not build an undercount into every report.
- **Idle loading.** `posthog-js` is dynamically imported after the load event,
  when the browser is idle, so it never competes with the page's LCP.
  Performance is part of what Open Waters sells.

### What cookieless mode costs

1. **No continuity across days.** This is the main cost. A visitor who arrives
   on Monday and enquires on Thursday counts as two visitors. The first channel
   gets no credit for the lead, returning-visitor figures are unreliable, and
   time to convert cannot be measured. It matters most for clients whose
   customers take a while to decide, which is most of them.
2. **Unique visitors exist only per day.** They cannot be summed into a week or
   a month. The analytics app already refuses to sum them.
3. **The same-day hash is approximate.** Two people on one office network with
   the same browser can merge into one. A phone that moves from wifi to mobile
   data can split into two.
4. **No person-level analysis**: no journeys, cohorts or retention. This is by
   design, not a limit of the mode.
5. **Experiments assign consistently within a day only.** Nobody runs one yet.
6. **Replay is undocumented in cookieless mode.** It is off everywhere.
7. **It is not a legal exemption.** The privacy notice and the objection control
   are still required.

Cookies would not fix the first cost. They would give continuity only for
visitors who accept a banner, and would lose everyone who ignores it. The
complete, daily picture is worth more. The honest fixes are self-reported
attribution, and carrying the landing attribution onto the lead. The second
change in this repo, `split-leads-by-channel`, does both.

### Campaigns and paid advertising

- **UTM-tagged campaigns need no consent.** The baseline records UTM parameters
  and referrers on every page view. Campaign visits, CTA clicks and form
  submissions are therefore measurable for everyone.
- **Advertising measurement always needs consent.** This covers pixels,
  conversion APIs, and Google's advanced consent mode pings. The ICO says
  advertising has "never" been exempt. So consent-based tools are layered on top
  of the baseline, never in place of it. Switching PostHog to `on_reject` would
  lose everyone who ignores the banner.

The skill's `references/advertising.md` (taxonomy v2, 22 September 2026) sets
out that layer in full:

- a first-party consent store
- the ICO banner checklist
- Google in basic consent mode only
- shared conversion names across platforms
- server-side conversions only when the submission carries consent
- enhanced matching off by default

It also sets how coverage is reported: the share of page views with
`ad_consent = "granted"`, and the acceptance rate from `consent_updated`.

### The review, and why this package exists

The architecture was judged sound:

- the versioned contract with "add, never rename"
- the drift check closing the loop
- server-side leads
- the cookieless baseline with consent layered on top
- client ownership

Three weaknesses were found, and are being fixed in this order:

1. **Distribution by copying**, this change. There are three copies of the
   contract, and only one is pinned by a test. A fix has to be pasted into
   every site, and a taxonomy bump means editing every site.
2. **The reliable lead count cannot be split by channel.**
   `split-leads-by-channel`, in this repo. `lead_submitted` carries a random id
   by design, so only `form_submitted` in the browser knows the channel, and
   `form_submitted` is subject to ad blockers.
3. **Provisioning is manual and repeated per client.** `add-provisioning`, in
   the analytics app. Two of the settings fail silently when they are missed.

Also noted, and not scheduled:

- The Revenue stage will stay sparse unless recording an outcome in the app is
  quick.
- The exception's conditions should be re-checked for each client once a year.
  A future provisioning check can automate the part about project settings.
- Every client depends on one vendor. A package makes changing vendor one
  change, not fifteen.

### Where things stand at this change

- **Taxonomy v2** is defined in the skill.
- **open-waters** runs a pasted v1.
- **Luxury Gardens** has an unapplied proposal, `add-analytics`, targeting v2.
- **The analytics app** mirrors v1 in `src/lib/event-list.ts`.
- **radara and fionacorbett** have no analytics yet.

## Goals / Non-Goals

**Goals:**

- One copy of the contract, generated into types and docs.
- The skill's reference code at v2, behaviourally identical and importable.
- Releases reach every consumer through a pull request, with no copying.

**Non-Goals:**

- New events, which are `split-leads-by-channel`'s job.
- Framework components such as a Next.js `<Analytics />` or an Astro
  integration. The wiring stays a few lines in each site, documented in the
  skill, until two sites have written the same thing twice.
- A public release.

## Decisions

### D1. Its own repo, on GitHub Packages

The package lives in `Open-Waters-Digital/analytics-contract` and is published
as `@open-waters-digital/analytics`.

- **Rejected: npm's private registry**, to keep `@openwaters/analytics`. It is
  paid per member, and depends on the org name being free.
- **Rejected: git tag dependencies.** They mean committed build output and
  slower installs.
- **Rejected: a workspace inside the analytics app.** Client sites would depend
  on an internal app's repository, and releases would share its CI and deploys.
- **The analytics app keeps its name.** Renaming it to free up `analytics` buys
  nothing, because GitHub Packages only constrains the scope, and it would touch
  the app's Railway source and docs.

### D2. `contract/events.json` as the source, with a generator

The JSON holds:

- the versions, each with its events: name, stage, `origin` (browser or
  server), and properties with a type (`string`, `integer`, `boolean`, or an
  enum of literals), plus whether each is required
- the super properties and the page types
- the baseline dashboard: each insight with a stable key, which provisioning
  uses to update in place
- the changelog

`scripts/generate.ts`, run with `tsx`, validates the JSON's own shape and
writes:

- `src/generated/contract.ts`: the types per version, `TAXONOMY_VERSION`,
  `EVENT_LISTS` and `PAGE_TYPES`
- `docs/events.md`: the same prose structure as the skill's file, with the
  prose kept in the JSON beside each event

`contract/published/v1.json` and `v2.json` are frozen snapshots. A test fails
if a version in the source differs from its snapshot. That is what makes
"never edit a published version" a mechanism rather than a rule.

- **Rejected: TypeScript as the source.** Docs and non-TypeScript readers would
  have to execute it.
- **Rejected: YAML.** It is another parser, and gains nothing JSON lacks.
- **Rejected: JSON Schema with a third-party generator.** It is a heavier
  dependency, for a shape that has five kinds of value.

### D3. Entry points, peers and the build

The package `exports` map has four entries: `./browser`, `./server`,
`./consent` and `./contract`. There is no root export, so every import says
what it is.

- **The build** is ESM only, with `tsc` emitting `.js` and `.d.ts` to `dist/`.
  Every consumer is a bundler or Node 22+.
- **Peer dependencies:** `posthog-js` and `posthog-node` are optional peers.
  Their ranges are the ones the reference was checked against (1.433+ and
  5.52+).
- **`sideEffects: false`**, so a bundler drops what a site does not use.
- **Rejected: tsup or another bundler.** Nothing needs bundling, and each
  dependency is a cost carried by every consumer's lockfile.
- **Rejected: CJS output.** No consumer needs it.

### D4. The API changes the reference makes

- **`initAnalytics({ site, key, apiHost, spa, regulated })`**. `site` is new
  and required. The rest is as in the reference.
- **`createServerCapture({ site, key })`** returns `capture(event, properties)`.
  It is a factory rather than a key argument on every call, so a route handler
  cannot pass the wrong site.
- It uses `requestTimeout: 5000` on `posthog-node`, since a hung upstream must
  not hang the request that called it.
- **`/consent` imports its reader from `/browser`**, as in the skill, so
  `ad_consent` and the store read one implementation.

### D5. Proving parity with the reference

Tests run in a DOM environment with a fake PostHog client, and assert that
each browser scenario produces the reference's events and properties:

- a CTA click, including an icon-only one
- `tel:`, `mailto:` and WhatsApp links
- a download and an outbound link
- scroll depths
- a form started, then left or submitted
- an objection
- routing in single-page mode
- the queue before load

The skill's reference file is copied into `test/fixtures/reference/` at v2,
and the same scenarios run against both. The fixture is deleted once the skill
no longer carries code, because by then the package is the reference.

### D6. Installing in consumers, and the token

A consumer adds `.npmrc`:

```
@open-waters-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

It then needs a `read:packages` token as a CI secret, and one in the Railway
build.

**In Docker**, the preferred pattern is a BuildKit secret mount on the install
step (`RUN --mount=type=secret,id=NODE_AUTH_TOKEN`). The secret never enters a
layer.

- Whether Railway supplies service variables as build secrets is to be
  verified in the task, and the README records the answer.
- If it does not, the token is an `ARG` in a dependencies stage only. The final
  stage copies `node_modules` out of it, so the `ARG` never appears in the final
  image's history.
- Either way the spec's `docker history` check is run.
- **Rejected: committing `node_modules` or a vendored tarball.** It is the
  copying problem again.

### D7. Renovate

`renovate/default.json` in this repo is a shared preset. Each consumer's
`renovate.json` is
`{ "extends": ["github>Open-Waters-Digital/analytics-contract//renovate/default"] }`.
The preset:

- auto-merges patch updates of `@open-waters-digital/analytics` once CI passes
- labels minor and major updates for review
- groups every other dependency weekly, so consumers do not drown in pull
  requests
- sets `hostRules` for `npm.pkg.github.com`

Installing the Renovate GitHub App on the organisation, and giving it package
read access, is a manual step for Alex. The task verifies that the first
update pull request appears.

- **Rejected: Dependabot.** It has no shared presets across repos, and grouping
  and auto-merge are weaker.

### D8. Releases by hand-set version and tag

A release goes like this:

1. Bump `package.json`.
2. Add a `CHANGELOG.md` entry.
3. Tag `vX.Y.Z` and push.
4. The workflow runs the gate, checks that the tag matches the version, and
   publishes with `GITHUB_TOKEN` (`packages: write`).

- **Rejected: semantic-release and Changesets.** Versions carry a judgement
  about the contract (minor for a new taxonomy version) that commit messages
  should not have to encode. It is also the choice luxury-gardens already
  made.

### D9. The skill becomes a pointer

**`implementation.md`** keeps the environments, the Astro and Next.js wiring
and the markup reference, now written against imports from the package. It
loses the two code listings.

**`advertising.md`** keeps everything except the `consent.ts` listing. The
platform loaders stay as snippets, because they are per-platform glue rather
than the contract.

**`events.md`** is replaced by a short file that:

- names the package
- gives the in-package path to `docs/events.md`
- restates the change rules

**`SKILL.md`**'s "Install on the site" step becomes "install the package".

## Risks / Trade-offs

- **[Every consumer now needs a token to install.]** → The README's set-up is
  four lines, and CI and Railway each hold one secret. The token is read-only
  for packages.
- **[A broken release reaches every site at once.]** → Patch auto-merge only
  happens once each consumer's own CI passes. Consumers' tests exercise their
  wiring. A bad release is fixed forward with a patch. It is never unpublished
  if a consumer has installed it.
- **[GitHub Packages has an outage during a deploy.]** → Installs are frozen
  from the lockfile, and Docker layers are cached. A deploy that cannot install
  fails before it replaces the running container.
- **[The reference and the package disagree during the move.]** → D5's parity
  tests, and the skill edit landing in the same change.

## Migration Plan

1. Build, test and publish `1.0.0`. Alex creates the GitHub repo and pushes,
   because `gh` is not installed on this machine.
2. Install Renovate on the organisation, with package access.
3. The analytics app adopts `/contract` (`adopt-the-contract-package`).
4. Luxury Gardens' `add-analytics` installs the package when it is applied.
5. open-waters moves from its pasted v1 to the package at v2, in a reviewed pull
   request.
6. The skill is edited to point at the package.

**Rollback:** a consumer pins the previous version. Nothing about a site's data
depends on the package's version.

## Changes during implementation

Recorded at archive, 23 September 2026. The diff shows what changed; this is
why.

- **The contract source uses `since` markers rather than a full list per
  version.** A version's list is derived. Adding is therefore the only edit
  that keeps the frozen snapshots green, which makes "add, never rename" a
  property of the file, not a rule someone has to remember.
- **The consumer bundle is measured with esbuild, not Vite (task 3.4).** The
  toolchain already carried esbuild through tsx, and it splits dynamic imports
  the same way.
- **Two corrections to the skill's consent store** (spec `consent-store`). A
  choice that cannot be stored no longer runs consent-gated code, and
  withdrawal clears cookies on every parent domain. The reference cleared
  `.co.uk` and missed `.example.co.uk` on every UK site.
- **Server capture resolves within five seconds overall, not only per
  request.** posthog-node retries a failed request, so a per-request timeout
  alone could hold the caller for fifteen seconds or more. The caller-facing
  promise races a five-second deadline, and any retry finishes in the
  background.
- **posthog-js is about 101 KB gzipped**, against the 50–60 KB assumed when
  this was proposed. It still loads only after idle; there is no smaller entry.
- **Railway has no BuildKit secret mounts (design D6's open question).** The
  `ARG`-in-the-install-stage pattern was verified on a real image, and it is
  the only pattern the README gives.
- **The first release failed** because the consumer fixture was typechecked
  before `dist/` existed. It is excluded from the typecheck, since only the
  measure step compiles it. Nothing had been published, so the `v1.0.0` tag was
  moved to the fix.
- **pnpm 11 consumers need `core-js: false` in `allowBuilds`.** It is added to
  the README and the skill.
- **The heatmaps gap.** The package forces heatmaps off, as the reference did.
  open-waters turns them on deliberately, so that became its own proposal,
  `add-heatmaps-option`.
- **Renovate's installation (task 8.2) was handed to Alex** with step-by-step
  instructions, and the change was archived before the first onboarding pull
  request arrived. Nothing depends on Renovate until the first consumer adopts
  the package.
