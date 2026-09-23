## Purpose

The Open Waters event list as one versioned source. It defines what every client
site may send to PostHog, and what the analytics app checks sites against.

## ADDED Requirements

### Requirement: One source

The contract SHALL be defined once, in `contract/events.json`. The type
definitions, the version constants and `docs/events.md` SHALL be generated from
it. A build or CI run SHALL fail when any generated file differs from what the
source produces.

#### Scenario: A stale generated file

- **WHEN** an event is added to `contract/events.json` without regenerating
- **THEN** `pnpm run ci:quality` fails and names the stale file

### Requirement: Every version is kept

The contract SHALL keep every published taxonomy version, each with its full
event list, the properties of each event, and whether each is sent by the
browser or the server. A version SHALL never be edited after it is published. A
new version SHALL only add events or optional properties. It SHALL never rename,
repurpose or remove one.

#### Scenario: Reading an old version

- **WHEN** the analytics app asks the contract export for version 1
- **THEN** it receives the version 1 list exactly as published, including
  `video_played`

#### Scenario: A rename attempted

- **WHEN** a change renames an event in the source
- **THEN** a contract test fails, because a published version's events differ
  from their recorded snapshot

### Requirement: Taxonomy v2 as the first packaged version

The package SHALL ship taxonomy versions 1 and 2, as defined in the
`openwaters-analytics` skill on 22 September 2026. Version 2 SHALL be the
current version.

#### Scenario: Parity with the skill

- **WHEN** version 2's generated `docs/events.md` is compared with the skill's
  `events.md` at version 2
- **THEN** every event, property, super property and page type matches

### Requirement: Typed events

The generated types SHALL make an event name that is not in the current version
a type error in a consumer. So SHALL a missing required property, and a
property value outside its declared set.

#### Scenario: An unlisted event

- **WHEN** a consumer calls `track("newsletter_signed_up", {})`
- **THEN** type checking fails

### Requirement: The baseline dashboard is part of the contract

The contract SHALL define the Digital Dividend baseline dashboard for each
taxonomy version, as data. Each insight SHALL have:

- a stable key
- a title
- its stage
- its kind: trend, funnel or breakdown
- the events it reads, and any breakdown property

Provisioning SHALL build a client's dashboard from this definition, and the
generated `docs/events.md` SHALL describe it.

#### Scenario: Reading the dashboard for v2

- **WHEN** the analytics app reads the baseline dashboard for version 2
- **THEN** it receives every insight the skill's "Baseline dashboard" table
  lists, each with a stable key

### Requirement: The documentation ships with the package

`docs/events.md` SHALL be included in the published package, so any repository
that installs it can read the contract offline.

#### Scenario: Reading the contract from a site

- **WHEN** a site has the package installed
- **THEN** `node_modules/@open-waters-digital/analytics/docs/events.md` holds the
  current contract
