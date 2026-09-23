# Open Waters analytics contract

`@open-waters-digital/analytics`, a private package on GitHub Packages. It holds
the event list every Open Waters client site sends to its own PostHog project,
and the code that sends it. It is the one copy of the contract that the client
sites, the Open Waters analytics app and the `openwaters-analytics` skill all
read.

**Any change to the contract or the package's behaviour goes through an OpenSpec
proposal first.** Proposing and applying are separate turns. See "Working with
OpenSpec" below.

---

## Who depends on it

| Consumer                                              | Uses                                                                                 | How it hears about a release      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| Client sites (luxury-gardens, open-waters, radara, …) | The browser helper, the server helper, and the consent store where there is a banner | A Renovate pull request           |
| The analytics app (`openwaters-digital/analytics`)    | The contract only: event lists for every version, page types, channel names          | A Renovate pull request           |
| The `openwaters-analytics` skill                      | The decisions and wiring. It links to this package rather than carrying code         | Edited by hand in the same change |

A site that cannot run JavaScript we control (Wix, Squarespace) cannot use the
package. It follows the contract by hand, and its `AGENTS.md` records what it
cannot send.

---

## The two version numbers

They are different things, and keeping them apart is the point.

- **The taxonomy version** is the contract: which events exist and what they
  carry. Every event sends it as `taxonomy_version`. It only ever goes up, and
  an event is never renamed or repurposed (see `docs/events.md`, "Changing this
  list").
- **The package version** is semver for the code:

| Change                                        | Package version | Merge in consumers                                         |
| --------------------------------------------- | --------------- | ---------------------------------------------------------- |
| A fix that changes no event, property or API  | Patch           | Automatic, once CI passes                                  |
| A new taxonomy version, or a new optional API | Minor           | Reviewed, because a site may need new markup               |
| A breaking API change                         | Major           | Reviewed. Should be rare: the contract itself never breaks |

A package release never removes an old taxonomy version from the contract
export. The analytics app reads sites on every version at once.

---

## Rules

- **`contract/events.json` is the only hand-written definition of the contract.**
  The TypeScript types and `docs/events.md` are generated from it, and CI fails
  if a generated file is stale.
- **No personal data can be expressed.** The types admit no free-text
  property that a site could fill with what a visitor typed. Attribution values
  are validated and truncated before they are sent.
- **Analytics never breaks the site.** Every exported function is a no-op
  without configuration, never throws, and never blocks rendering or a form.
- **Nothing reaches a client bundle that the site did not import.** Browser,
  server, consent and contract are separate entry points. `posthog-js` is only
  ever loaded through a dynamic import.
- **Legal positions live in the skill.** This package enforces them in code, but
  the reasoning and the ICO references stay in the `openwaters-analytics` skill,
  where they are read at setup time.

---

## Working with OpenSpec

`@fission-ai/openspec` is a dev dependency.

- Use `/opsx:propose` before any change to the contract or the package's
  behaviour. Then `/opsx:apply`, then `/opsx:archive`.
- Skip a proposal only for bug fixes that change no event or API, typos, and
  dependency bumps.
- `openspec/specs/` is the living specification. `openspec/changes/archive/`
  holds everything that has shipped.

## Commit messages

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
Scopes: `contract`, `browser`, `server`, `consent`, `build`, `release`, `docs`,
`spec`. The body carries the reasoning, what was measured and what was
rejected.

## Definition of done

1. `pnpm run ci:quality` passes, and the real output is reported. This gate
   arrives with the first change.
2. Generated files are current.
3. New behaviour has tests, including its failure modes.
4. A taxonomy change has a changelog line and a version bump in
   `contract/events.json`.
5. The skill and the consumers' follow-ups are named in the change.
6. This document has been swept.
