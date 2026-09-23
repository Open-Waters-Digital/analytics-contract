# server-capture Specification

## Purpose
Sending the contract's server events, such as `lead_submitted`, from a site's
form handler, without ever failing, throwing into, or delaying the work that
called it.

## Requirements

### Requirement: Never fails the caller

`captureServerEvent` SHALL resolve, never reject, in every case:

- a missing or empty key
- a PostHog error
- a network failure
- a timeout

A failure SHALL be logged with the event name and nothing from the properties.

#### Scenario: PostHog unreachable

- **WHEN** the capture is called while PostHog does not answer
- **THEN** the promise resolves within the timeout, and one error naming the
  event is logged

#### Scenario: No key

- **WHEN** it is called with an empty key
- **THEN** it resolves at once, and makes no request

### Requirement: A bounded request

Every request to PostHog SHALL time out after at most five seconds.

#### Scenario: A hung upstream

- **WHEN** PostHog accepts the connection and never responds
- **THEN** the capture resolves within five seconds

### Requirement: Nothing links to a visitor

Every server event SHALL carry a fresh random distinct id, the site slug, the
taxonomy version, and `$process_person_profile: false`. It SHALL carry no
identifier shared with browser events or with other server events.

#### Scenario: Two leads

- **WHEN** two `lead_submitted` events are sent
- **THEN** their distinct ids differ, and neither matches any browser session
