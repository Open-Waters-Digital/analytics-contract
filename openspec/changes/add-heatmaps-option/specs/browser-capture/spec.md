## MODIFIED Requirements

### Requirement: Behaviour matches the skill's reference

The browser entry point SHALL behave exactly as the skill's reference
`analytics.ts` at taxonomy v2. That covers:

- idle loading after the load event
- `cookieless_mode: "always"` and no person profiles
- no replay, and no heatmaps unless the site opts in (see "Heatmaps are a
  per-site choice")
- the super properties
- the click, form and scroll listeners
- the objection control and the form helpers

The only differences SHALL be that the site's slug is passed to `initAnalytics`
rather than edited into the file, and the optional heatmaps setting.

#### Scenario: The same events as the reference

- **WHEN** the test suite drives a page through a CTA click, a `tel:` link, a
  download, a form started and left, and scrolling to the foot
- **THEN** the captured events and properties are identical to the reference
  implementation's

## ADDED Requirements

### Requirement: Heatmaps are a per-site choice

`initAnalytics` SHALL accept an optional `heatmaps` setting. PostHog SHALL
capture heatmaps only when the setting is `true`. When it is absent or `false`,
PostHog SHALL be initialised with heatmaps off, exactly as before the setting
existed.

The setting SHALL change nothing else: cookieless mode, person profiles,
session replay, masking, the super properties and the listeners SHALL behave
the same whichever way it is set. It SHALL have no effect when analytics is not
live: with no key, with the visitor objecting, or outside a browser.

#### Scenario: Not set

- **WHEN** a site calls `initAnalytics` without `heatmaps`
- **THEN** PostHog is initialised with `capture_heatmaps: false`

#### Scenario: Opted in

- **WHEN** a site calls `initAnalytics` with `heatmaps: true`
- **THEN** PostHog is initialised with `capture_heatmaps: true`, and
  `cookieless_mode: "always"`, `person_profiles: "never"` and
  `disable_session_recording: true` are unchanged

#### Scenario: Opted in, but the visitor objected

- **WHEN** a site sets `heatmaps: true` and the visitor has used the objection
  control
- **THEN** PostHog is never loaded, and nothing is captured

#### Scenario: A regulated site

- **WHEN** a site sets both `heatmaps: true` and `regulated: true`
- **THEN** heatmaps are captured with element text and attributes still masked
