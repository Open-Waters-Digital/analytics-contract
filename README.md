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
`/browser` module is **1.9 KB gzipped**. `posthog-js` arrives as a separate
chunk after the page is idle, and is **about 101 KB gzipped**; it has no smaller
entry point. Nothing PostHog-related is in the initial bundle.

## Installing in a site

1. Tell pnpm where the scope lives. In the site's `.npmrc`:

   ```
   @open-waters-digital:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

   The token is read from the environment, so `.npmrc` holds no secret and is
   committed.

2. Create a GitHub token with **`read:packages` only** and provide it as
   `NODE_AUTH_TOKEN`:
   - locally, in your shell or an untracked env file
   - in CI, as a repository secret passed to the install step
   - on Railway, as a service variable, listed with `preserve()` in
     `.railway/railway.ts`

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

4. Extend the shared Renovate preset, so releases arrive as pull requests. In
   the site's `renovate.json`:

   ```json
   {
     "extends": [
       "github>Open-Waters-Digital/analytics-contract//renovate/default"
     ]
   }
   ```

   Patch releases merge themselves once the site's CI passes. A minor release
   (a new taxonomy version) waits for review.

### In a Docker build (Railway)

Railway does not support BuildKit secret mounts. It passes service variables to
a Dockerfile as build arguments, and a build argument used in a `RUN` step is
recorded in that stage's history. So the token is declared **only in the stage
that installs**, and the runtime stage copies what it needs out of it:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
# Only here. Railway supplies it from the service variable of the same name.
ARG NODE_AUTH_TOKEN
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# …the build output. Never `ARG NODE_AUTH_TOKEN` in this stage.
```

Checked on 23 September 2026 with a test image built this way: neither
`docker history --no-trunc` nor `docker image inspect` of the final image, nor
a search of its filesystem, finds the token.

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

And in a form handler, after the enquiry is safely delivered:

```ts
import { createServerCapture } from "@open-waters-digital/analytics/server";

const capture = createServerCapture({
  site: "your-client-slug",
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
});

void capture("lead_submitted", { form_id: "contact", lead_type: "general" });
```

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
