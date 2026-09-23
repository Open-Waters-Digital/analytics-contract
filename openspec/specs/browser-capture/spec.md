# browser-capture Specification

## Purpose
Sending the contract's browser events to a site's PostHog project: cookieless,
off the critical path, and never able to break the page.

## Requirements

### Requirement: Behaviour matches the skill's reference

The browser entry point SHALL behave exactly as the skill's reference
`analytics.ts` at taxonomy v2. That covers:

- idle loading after the load event
- `cookieless_mode: "always"` and no person profiles
- no replay and no heatmaps
- the super properties
- the click, form and scroll listeners
- the objection control and the form helpers

The only difference SHALL be that the site's slug is passed to `initAnalytics`
rather than edited into the file.

#### Scenario: The same events as the reference

- **WHEN** the test suite drives a page through a CTA click, a `tel:` link, a
  download, a form started and left, and scrolling to the foot
- **THEN** the captured events and properties are identical to the reference
  implementation's

### Requirement: The site slug is required

`initAnalytics` SHALL require a site slug. Every browser event SHALL carry it as
`site`.

#### Scenario: A missing slug

- **WHEN** a consumer calls `initAnalytics` without `site`
- **THEN** type checking fails

### Requirement: No cost when not configured

Without a key and a host, or once the visitor has objected, the browser entry
point SHALL:

- import nothing further
- attach no listeners
- make no request

Importing the entry point SHALL NOT import `posthog-js`.

#### Scenario: A preview build

- **WHEN** `initAnalytics` is called with an empty key
- **THEN** no listener is attached and `posthog-js` is never requested

#### Scenario: The eager bundle

- **WHEN** a consumer's production build includes the browser entry point
- **THEN** the page's initial JavaScript contains no `posthog-js` code
