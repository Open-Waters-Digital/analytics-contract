## Purpose

How the package is published, how its version relates to the contract, and how
every consumer receives a release without anyone copying code.

## ADDED Requirements

### Requirement: Published privately on tag

Pushing a tag of the form `vX.Y.Z` SHALL run the full quality gate, then publish
that version to GitHub Packages under the Open-Waters-Digital organisation.
Publishing SHALL be refused when:

- the gate fails
- the tag differs from the `package.json` version
- a generated file is stale

#### Scenario: A mismatched tag

- **WHEN** `v1.0.1` is pushed while `package.json` says `1.0.0`
- **THEN** the workflow fails before publishing

### Requirement: Semver follows the contract

A new taxonomy version SHALL be a minor release. A fix that changes no event,
property or export SHALL be a patch. Removing or changing an export SHALL be a
major release. No release SHALL remove a taxonomy version from the contract
export.

#### Scenario: Adding taxonomy v3

- **WHEN** a change adds taxonomy version 3
- **THEN** it is released as the next minor version, and version 1 and 2 remain
  readable

### Requirement: Updates reach consumers without copying

The repository SHALL publish a shared Renovate preset. Under it, every consumer
that extends the preset:

- receives a pull request for each release of the package
- merges patch releases unattended once its CI passes
- leaves minor and major releases for review

#### Scenario: A patch release

- **WHEN** `1.0.1` is published
- **THEN** each consumer receives a pull request that merges itself once its CI
  passes

#### Scenario: A taxonomy release

- **WHEN** `1.1.0` is published
- **THEN** each consumer receives a pull request that waits for review

### Requirement: The install token stays out of images

The consumer set-up documented in the README SHALL install the package in a
Docker build without the read token being present in any layer of the final
image, or in its history.

#### Scenario: Inspecting an image

- **WHEN** `docker history` and the final image's filesystem are searched for
  the token
- **THEN** it is not found
