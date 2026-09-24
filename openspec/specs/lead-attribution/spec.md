# lead-attribution Specification

## Purpose
Carrying where a visit came from onto the lead it produced. The server-side
lead count, the one no ad blocker reduces, can then be split by channel with no
identifier linking the lead to a visitor.

## Requirements

### Requirement: Taxonomy v3 lead properties

Taxonomy v3 SHALL add these properties to `lead_submitted`:

- an optional `channel`, one of `direct`, `organic_search`, `paid_search`,
  `organic_social`, `paid_social`, `email`, `ai`, `referral`, `other_paid` or
  `unknown`. Optional in the contract, because a new version only adds
  optional properties; always sent in practice (see "Every lead carries a
  channel")
- optional `utm_source`, `utm_medium`, `utm_campaign` and `referring_domain`
- optional `heard_about`, one of `search_engine`, `social_media`,
  `recommendation`, `directory`, `press`, `event`, `returning_client` or
  `other`

It SHALL add an optional `channel`, from the same set, to `lead_qualified` and
`deal_won`. Every version 1 and 2 event and property SHALL be unchanged.

#### Scenario: A v3 lead with no attribution

- **WHEN** a site on v3 sends `lead_submitted` for a submission that carried no
  attribution
- **THEN** it carries `channel: "unknown"`, and no UTM or referrer property

#### Scenario: Earlier versions intact

- **WHEN** the contract export is read for version 2
- **THEN** `lead_submitted` has exactly the properties it had before this
  change

### Requirement: Every lead carries a channel

The server capture SHALL send `channel` on every `lead_submitted` at taxonomy
v3. When the caller passes none, it SHALL send `channel: "unknown"`. A channel
the caller does pass SHALL be sent unchanged.

#### Scenario: A site that passes no channel

- **WHEN** a site on v3 sends `lead_submitted` with only `form_id` and
  `lead_type`
- **THEN** the event carries `channel: "unknown"`

#### Scenario: A site that passes one

- **WHEN** a site sends `lead_submitted` with `channel: "paid_social"`
- **THEN** the event carries `channel: "paid_social"`

### Requirement: First touch in the tab's session

When analytics is live and the visitor has not objected, the browser SHALL
record the landing attribution on the first page view of a tab's session:

- the UTM source, medium and campaign from that page's URL
- the referring hostname, if it is not the site's own

Later pages in the same session SHALL NOT replace it. It SHALL be kept only for
the life of the tab. It SHALL hold no identifier, and no click identifier such
as `gclid` or `fbclid`.

When analytics is not live, or the visitor has objected, nothing SHALL be
stored.

#### Scenario: A campaign landing, then browsing

- **WHEN** a visitor lands on `/?utm_source=instagram&utm_medium=social&utm_campaign=spring`,
  then visits two more pages and opens the form
- **THEN** the form's attribution holds source `instagram`, medium `social` and
  campaign `spring`

#### Scenario: A click identifier

- **WHEN** a visitor lands with `?gclid=abc123&utm_source=google&utm_medium=cpc`
- **THEN** the stored attribution holds the source and medium, and nothing
  derived from `gclid`

#### Scenario: An objecting visitor

- **WHEN** a visitor who has objected lands from a campaign
- **THEN** nothing is written to session storage

### Requirement: Attribution sent with the form

The browser SHALL provide a value that a site's form code sends with a
submission. It SHALL carry the stored attribution, or an empty value when there
is none.

#### Scenario: No stored attribution

- **WHEN** the form is sent by a visitor who arrived directly
- **THEN** the value sent carries no source, medium, campaign or referrer

### Requirement: The server never trusts attribution

The server SHALL parse the submitted attribution before using it:

- values are lowercased, trimmed and cut to 100 characters
- only letters, digits, `.`, `_`, `-`, `+` and spaces are kept
- a value containing `@`, or six or more consecutive digits, is dropped
- the referring domain is reduced to a hostname
- anything that is not the expected shape is treated as no attribution

A parse SHALL never throw.

#### Scenario: Personal data in a UTM value

- **WHEN** a submission's attribution has `utm_campaign` set to
  `jane.doe@example.com`
- **THEN** the lead carries no `utm_campaign`

#### Scenario: A forged body

- **WHEN** the attribution field holds a nested object, an array or 10 KB of text
- **THEN** it is treated as no attribution and the lead carries
  `channel: "unknown"`

### Requirement: One channel classification

The contract SHALL provide one function that maps attribution to a channel. It
SHALL be deterministic, and SHALL match PostHog's channel type for the same
source, medium and referring domain wherever the two share a channel. Every
site and the analytics app SHALL use it.

#### Scenario: Paid social

- **WHEN** the attribution has source `facebook` and medium `paid`
- **THEN** the channel is `paid_social`

#### Scenario: An AI assistant

- **WHEN** the attribution has the referring domain `chatgpt.com`, or the
  source `perplexity`
- **THEN** the channel is `ai`

#### Scenario: A search referrer without tags

- **WHEN** the attribution has no UTM values and the referring domain
  `www.google.com`
- **THEN** the channel is `organic_search`

#### Scenario: Nothing at all

- **WHEN** the attribution is empty
- **THEN** the channel is `direct` for a submission that carried an empty value,
  and `unknown` for one that carried none, such as a form sent without
  JavaScript

### Requirement: The dashboard shows leads by channel

The baseline dashboard definition SHALL include `lead_submitted` broken down by
`channel`, and by `heard_about`.

#### Scenario: A provisioned project

- **WHEN** the baseline dashboard is created from the definition at v3
- **THEN** it contains both insights
