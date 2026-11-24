# Spec Delta

## MODIFIED Requirements

### Requirement: Every version is kept

The contract SHALL keep every published taxonomy version, each with its full
event list, the properties of each event, and whether each is sent by the
browser or the server. A version SHALL never be edited after it is published. A
new version SHALL only add events, optional properties, or values to an
existing optional property's set of values, each marked with the version that
added it. It SHALL never rename, repurpose or remove an event, a property or a
value.

#### Scenario: Reading an old version

- **WHEN** the analytics app asks the contract export for version 1
- **THEN** it receives the version 1 list exactly as published, including
  `video_played`

#### Scenario: A rename attempted

- **WHEN** a change renames an event in the source
- **THEN** a contract test fails, because a published version's events differ
  from their recorded snapshot

#### Scenario: A value added in a later version

- **WHEN** the contract export is read for version 3 after `ai_assistant` was
  added to `heard_about` in version 4
- **THEN** version 3's `heard_about` lists exactly its eight published values,
  and version 4's lists nine

#### Scenario: A value with no version

- **WHEN** a value is added to a published property's set without marking the
  version that added it
- **THEN** the published version's snapshot test fails

#### Scenario: A value marked earlier than its property

- **WHEN** an enum value is marked with a version before its property's own
- **THEN** generating fails and names the value
