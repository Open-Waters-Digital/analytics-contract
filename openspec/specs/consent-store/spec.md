# consent-store Specification

## Purpose
Recording a visitor's consent choices on sites with a consent banner, so that
advertising and replay tools load only for visitors who accepted, and every
event can say what the visitor chose.

## Requirements

### Requirement: Behaviour matches the skill's reference

The consent entry point SHALL behave as the consent store in the skill's
`advertising.md`:

- a versioned choice per category, stored under `ow-consent`
- the choice expires after about six months
- `consent_updated` is sent on each explicit choice
- listeners run when a category is granted
- withdrawing a category clears the platforms' cookies and reloads the page

#### Scenario: Withdrawing advertising

- **WHEN** a visitor who accepted advertising withdraws it in settings
- **THEN** `consent_updated` is sent with `advertising: false` and
  `source: "settings"`, the known platform cookies are cleared, and the page
  reloads

#### Scenario: An expired choice

- **WHEN** a stored choice is older than six months
- **THEN** it reads as no choice, and every event carries `ad_consent: "unset"`

### Requirement: Storage refused is consent refused

When the browser refuses storage, every category SHALL read as not granted, and
no consent-gated code SHALL run.

#### Scenario: Blocked storage

- **WHEN** `localStorage` throws on write
- **THEN** `hasConsent("advertising")` returns false
