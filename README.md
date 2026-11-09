# @open-waters-digital/analytics

The Open Waters analytics contract: the event list every client site sends to
its own PostHog project, and the code that sends it. Private, on GitHub
Packages.

The decisions behind it (cookieless PostHog, the ICO's statistical purposes
exception, consent for advertising) are in the `openwaters-analytics` skill.
This package is the code; the skill is the reasoning and the setup order. The
contract itself is [`docs/events.md`](docs/events.md), which ships inside the
package.

## Entry points

There is no root import, so every import says what it is and a site bundles
only what it uses.

| Import                                    | For                                                                                                             | Loads                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `@open-waters-digital/analytics/browser`  | `initAnalytics`, `track`, the form helpers, the objection control                                               | `posthog-js`, by dynamic import, after idle only |
| `@open-waters-digital/analytics/server`   | `createServerCapture`, for `lead_submitted` and the other server events                                         | `posthog-node`                                   |
| `@open-waters-digital/analytics/consent`  | The consent store, on sites with a consent banner only                                                          | Nothing extra                                    |
| `@open-waters-digital/analytics/contract` | Every taxonomy version's events, super properties and page types, and the baseline dashboard. No runtime import | Nothing                                          |

`posthog-js` and `posthog-node` are optional peer dependencies: install the one
you use.

**Cost in the page**, measured by `pnpm run measure` on every CI run: the eager
`/browser` module is **2.1 KB gzipped** (2,130 bytes at 1.2.1). `posthog-js` arrives as a separate
chunk after the page is idle, and is **about 101 KB gzipped**; it has no smaller
entry point. Nothing PostHog-related is in the initial bundle.

## Installing in a site

1. Tell pnpm where the scope lives. In the site's committed `.npmrc`, the
   scope line and nothing else:

   ```
   @open-waters-digital:registry=https://npm.pkg.github.com
   ```

   **Do not put the token line here.** pnpm 11.5.3 and later do not expand an
   environment variable in a project `.npmrc`'s auth line, so
   `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` in the site's own file
   fails with a 401 on current pnpm, whatever the variable holds. Found on 24
   September 2026 installing into Luxury Gardens with pnpm 11.27.

2. Create a GitHub token with **`read:packages` only**, `NODE_AUTH_TOKEN`, and
   give it to pnpm through a **user-level** `.npmrc`, which pnpm does expand:
   - **Locally:** put the variable in your shell, and this line in `~/.npmrc`:

     ```
     //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
     ```

   - **In CI:** `actions/setup-node` writes that file for you. Give it the
     registry and scope, and the secret to the install step:

     ```yaml
     - uses: actions/setup-node@v7
       with:
         node-version-file: package.json
         registry-url: https://npm.pkg.github.com
         scope: "@open-waters-digital"
     - run: pnpm install --frozen-lockfile
       env:
         NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
     ```

   - **On Railway:** a service variable, listed with `preserve()` in
     `.railway/railway.ts`, and passed to the Docker build as below.

3. Install:

   ```sh
   pnpm add @open-waters-digital/analytics posthog-js
   pnpm add @open-waters-digital/analytics posthog-node   # if the site has a form handler
   ```

   pnpm 11 stops the install until every dependency's build script is decided.
   `posthog-js` depends on `core-js`, whose script only prints a banner, so add
   it to `pnpm-workspace.yaml` as not needed:

   ```yaml
   allowBuilds:
     core-js: false
   ```

4. Extend the organisation's Renovate settings and this package's rules, in
   that order, so releases arrive as pull requests. In the site's
   `renovate.json`:

   ```json
   {
     "extends": [
       "github>Open-Waters-Digital/renovate-config",
       "github>Open-Waters-Digital/analytics-contract//renovate/default"
     ]
   }
   ```

   The first is `Open-Waters-Digital/renovate-config`: the schedule, grouping,
   release-age wait and GitHub Packages access every repository shares. The
   second, `renovate/default.json` here, holds only this package's rules. Patch
   releases merge themselves once the site's CI passes. A minor release (a new
   taxonomy version) waits for review.

### In a Docker build (Railway)

Railway does not support BuildKit secret mounts. It passes service variables to
a Dockerfile as build arguments, which brings two problems, and the pattern
below handles both.

- **A build argument used in a `RUN` step is recorded in that stage's
  history.** So the token is declared only in the stages that install, and the
  runtime stage copies what it needs out of them.
- **BuildKit prints a `RUN` step with its build arguments expanded.** Written
  inline, as `RUN printf '...%s' "$NODE_AUTH_TOKEN" > ~/.npmrc && pnpm install`,
  the token appears in plain text in the build log, which anyone with access
  to the Railway project can read. So the install runs from a script, and the
  step reads only `sh docker-install.sh`. Found on 24 September 2026, when a
  Luxury Gardens build log carried the token 13 times.

`scripts/docker-install.sh`, committed:

```sh
#!/bin/sh
# pnpm 11.5.3+ will not expand a token from the committed .npmrc, so a
# user-level one is written, used and removed in this one step: it never lands
# in a layer, and the step's printed command never contains it.
printf '//npm.pkg.github.com/:_authToken=%s\n' "${NODE_AUTH_TOKEN:-}" > "$HOME/.npmrc"
pnpm install --frozen-lockfile "$@"
status=$?
rm -f "$HOME/.npmrc"
exit $status
```

The Dockerfile:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
# Only here. Railway supplies it from the service variable of the same name.
ARG NODE_AUTH_TOKEN
COPY package.json pnpm-lock.yaml .npmrc scripts/docker-install.sh ./
RUN corepack enable && sh docker-install.sh

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# …the build output. Never `ARG NODE_AUTH_TOKEN` in this stage.
```

A production-dependencies stage installs the same way, with
`sh docker-install.sh --prod`.

Checked on 24 September 2026 with a full Luxury Gardens image built this way:
no layer, no `docker history --no-trunc` entry, no `docker image inspect`
field and no line of the build log carries the token, and the private package
still installs.

### Wiring

The skill's `references/implementation.md` has the Next.js and Astro wiring. In
short, for Next.js:

```tsx
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  initAnalytics,
  pageChanged,
} from "@open-waters-digital/analytics/browser";

export function Analytics() {
  const pathname = usePathname();
  const firstRender = useRef(true);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    initAnalytics({
      site: "your-client-slug",
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      spa: true,
      regulated: false,
      // heatmaps: true, // only if this client has decided on aggregate heatmaps
    });
  }, []);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    pageChanged();
  }, [pathname]);
  return null;
}
```

**Heatmaps are off unless a site passes `heatmaps: true`.** They are a
per-client decision: aggregate click and scroll maps can fall under the ICO's
statistical purposes exception, but only viewed in aggregate, and the site's
`AGENTS.md` must record why they are on. Only a real `true` counts, not the
string `"true"` from an environment variable. PostHog's project-level heatmaps
setting cannot override the site: the package always sets the option.

**Leads by channel (1.2.0, taxonomy v3).** The browser keeps the tab's first
touch (UTM tags and referring hostname) in session storage. The form sends
`attributionField()` as `ow_attribution`, and the handler parses and classifies
it; see below. The site's privacy page must mention the session-stored
attribution.

And in a form handler, after the enquiry is safely delivered:

```ts
import { createServerCapture } from "@open-waters-digital/analytics/server";

const capture = createServerCapture({
  site: "your-client-slug",
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
});

const attribution = parseAttribution(body.ow_attribution);
void capture("lead_submitted", {
  form_id: "contact",
  lead_type: "general",
  channel: classifyChannel(attribution),
  ...attribution,
});
```

`classifyChannel` comes from `/contract` and `parseAttribution` from `/server`.
A lead that passes no channel is sent as `channel: "unknown"`.

`capture` never throws or rejects, and resolves within five seconds whatever
PostHog does.

## Working on the package

```sh
pnpm install
pnpm run ci:quality     # everything CI runs
pnpm run generate       # after editing contract/events.json
```

- `contract/events.json` is the only hand-written definition of the contract.
  `src/generated/contract.ts` and `docs/events.md` are generated from it, and
  CI fails if either is stale.
- `contract/published/v<N>.json` freezes each taxonomy version. A test fails if
  the source stops resolving to it, which is what stops an event being renamed.
- Any change to the contract or the package's behaviour is an OpenSpec proposal
  first. See `AGENTS.md`.

## Releasing

Versions are set by hand, because a version carries a judgement about the
contract. A new taxonomy version is a **minor** release. A fix that changes no
event, property or export is a **patch**.

1. Bump `version` in `package.json`, and add a `CHANGELOG.md` entry.
2. Commit, then tag and push: `git tag v1.2.3 && git push origin main v1.2.3`.
3. The release workflow checks that the tag matches `package.json`, runs the
   whole gate, and publishes to GitHub Packages.
4. Renovate opens the update in every consumer.

A published version is never unpublished once a consumer may have installed
it. A bad release is fixed forward with a patch.
