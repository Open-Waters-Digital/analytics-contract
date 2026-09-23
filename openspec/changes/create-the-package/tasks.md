## 1. Toolchain and gate

- [x] 1.1 Add TypeScript (strict, `noUncheckedIndexedAccess`), ESLint, Prettier, Vitest with happy-dom, and `tsx`. Define `lint`, `typecheck`, `test`, `build`, `generate` and `generate:check`. `ci:quality` runs all of them. Verify that `pnpm run ci:quality` passes on the empty package.
- [x] 1.2 Add `.github/workflows/ci.yml` (frozen install, `ci:quality`) on pushes and pull requests. Verify on the first push, which is Alex's once the GitHub repo exists.
  - Verified 2026-09-23: CI ran green on `b20a78e`, with the same gate in the Release run. The first run, on `0076d52`, failed at typecheck: the consumer fixture imported `dist/` before the build. That was fixed in `b20a78e` and checked from a fresh clone with a frozen install.
- [x] 1.3 Set the `exports` map (`./browser`, `./server`, `./consent`, `./contract`), `files` (`dist`, `docs`), `sideEffects: false`, and the optional peers `posthog-js` and `posthog-node`. Verify with `pnpm pack --dry-run`, which lists only `dist/`, `docs/`, the README, the changelog and `package.json`.

## 2. The contract

- [x] 2.1 Write `contract/events.json` holding versions 1 and 2, the super properties, the page types, the baseline dashboard per version (each insight with a stable key) and the changelog, transcribed from the skill's `events.md` at v2. Verify that every event, property and dashboard insight in the skill appears.
- [x] 2.2 Write `scripts/generate.ts`. It validates the JSON's shape, and emits `src/generated/contract.ts` and `docs/events.md`. Verify with tests that a malformed file (an unknown type, a duplicate event, a version gap) fails with a message naming the problem.
- [x] 2.3 Freeze `contract/published/v1.json` and `v2.json`, and add the test that fails when the source's version differs from its snapshot. Verify by renaming an event locally and watching the test fail.
- [x] 2.4 Add `generate:check`, which regenerates to a temporary directory and diffs against the committed files. Verify that it fails on a hand-edited `docs/events.md`.
- [x] 2.5 Compare the generated `docs/events.md` with the skill's `events.md` at v2. Verify that events, properties, super properties and page types match. Record any prose difference in the task note.
  - Note (2026-09-23): the only differences are prose, and they are deliberate. The header points at the package. The advertising links are rewritten, because the doc ships outside the skill. There are "new in v2" markers. "Channel type and referring domain" is two insights, because each needs a key. "Changing this list" describes the package workflow. The dashboard table lists Consent before Revenue. Events, properties, super properties and page types match exactly.
- [x] 2.6 Write type tests (`expectTypeOf` or `@ts-expect-error`) for an unlisted event, a missing required property and a value outside an enum. Verify that each fails to compile as intended.

## 3. Browser

- [x] 3.1 Port the skill's `analytics.ts` at v2 to `src/browser.ts`, with `site` as a required `initAnalytics` option and the types from the generated contract. Verify that `pnpm run typecheck` passes against `posthog-js` 1.433.
- [x] 3.2 Copy the reference into `test/fixtures/reference/`, and write the parity scenarios from design D5 against both implementations. Verify that the event streams are identical.
- [x] 3.3 Test the failure modes. Verify each of these:
  - an empty key attaches no listeners and never imports `posthog-js`
  - an objection does the same
  - blocked storage reads as not objected
  - the queue drops beyond 100 events
- [x] 3.4 Build a minimal consumer fixture (a Vite page importing `/browser`; built with esbuild instead, which the toolchain already carries and which splits dynamic imports the same way). Verify with its production build that the initial chunk holds no `posthog-js` code, and record the eager module's gzipped size for the README.
  - Measured on 2026-09-23: the eager `/browser` entry is 1,879 bytes gzipped. The `posthog-js` chunk, fetched after idle, is 101,376 bytes gzipped, which is well above the 50–60 KB Luxury Gardens' proposal estimated. posthog-js 1.433 has no slimmer entry point. `pnpm run measure` runs in `ci:quality`.

## 4. Server

- [x] 4.1 Port `analytics-server.ts` to `src/server.ts` as `createServerCapture({ site, key })`, with `requestTimeout: 5000`. Verify that `pnpm run typecheck` passes against `posthog-node` 5.52.
- [x] 4.2 Test the failure modes, with a local HTTP server standing in for PostHog. Verify each of these:
  - no key makes no request
  - a 500 resolves and logs once
  - a connection that never answers resolves within five seconds
  - a thrown capture resolves
  - no log line contains a property value
  - two captures have different distinct ids

## 5. Consent

- [x] 5.1 Port the skill's `consent.ts` to `src/consent.ts`, reading from `/browser`. Verify with tests for each of these:
  - an explicit choice sends `consent_updated`
  - a withdrawal clears the cookies and reloads
  - an expired choice or an older version reads as none
  - blocked storage reads as refused
  - `onConsent` runs immediately when consent is already granted, and later when it is granted afterwards

## 6. Contract export

- [x] 6.1 Export `EVENT_LISTS`, `TAXONOMY_VERSION`, `PAGE_TYPES`, `BASELINE_DASHBOARDS` and the per-version types from `/contract`, with no runtime import of PostHog. Verify with a test that importing `/contract` loads neither peer.

## 7. Distribution

- [x] 7.1 Add `.github/workflows/release.yml`. On a `v*` tag it runs the gate, checks that the tag equals the `package.json` version, and publishes to GitHub Packages with `GITHUB_TOKEN` (`packages: write`). Verify the version check locally with `act`, or by reading the step's script, and in full on the first real release.
  - Verified 2026-09-23: the tag check passed and failed as expected locally. Release run #2 for `v1.0.0`, on `b20a78e`, ran the tag check, the gate and Publish green. Run #1 failed before Publish, so nothing was published and the unpublished tag was moved.
- [x] 7.2 Add `renovate/default.json` (design D7). Verify it with `npx --package renovate renovate-config-validator`.
- [x] 7.3 Write the README:
  - what the package is, and its four entry points
  - the `.npmrc` set-up and the token
  - Next.js and Astro wiring pointing at the skill
  - the Docker pattern
  - the measured bundle size
  - the release steps

  Verify by following it into a scratch Next.js app, and confirming that it installs and builds.
  - Checked 2026-09-23 against the packed 1.0.0 tarball in a scratch Next 16 app. It installs and builds with `/` prerendered static. The route handler using `/server` answers at runtime, and the page carries its markup. pnpm 11 needs `core-js: false` in `allowBuilds` (from posthog-js), which is now in the README.
- [x] 7.4 Establish whether Railway supplies service variables as BuildKit secrets. Record the answer and the resulting Dockerfile pattern in the README. Verify with a test image: `docker history --no-trunc` and a filesystem grep of the final image find no token.
  - Answer (2026-09-23): no. Railway does not support BuildKit secret mounts, and passes service variables as build arguments ([Railway: build-time vs runtime secrets](https://docs.railway.com/guides/build-time-vs-runtime-secrets)). The pattern is an `ARG` in the dependencies stage only. In a test image, the final image's history, its `docker image inspect` and its filesystem held the token 0 times; the control was the `deps` stage's own history, which held it twice.

## 8. Release and consumers

- [x] 8.1 Write `CHANGELOG.md` with `1.0.0` and set the version. Hand the GitHub repo creation, the first push and the `v1.0.0` tag to Alex. Verify that the package appears under the organisation's packages once the release workflow finishes.
  - Released 2026-09-23: `v1.0.0` on `b20a78e`, published by the Release workflow (reported by Alex).
- [ ] 8.2 Hand Renovate's installation to Alex (the GitHub App on the organisation, with package read access). Verify that a consumer with the preset receives its onboarding pull request.
- [x] 8.3 Edit the skill (design D9) in `~/.agents` and commit it there. Verify that no listing of `analytics.ts`, `analytics-server.ts` or `consent.ts` remains, and that every reference to the contract names the package.
  - Done 2026-09-23 in `~/.agents` (`dc12e19`): no code listing remains, and the install, wiring, consent and contract all name the package. The reference fixture and its parity run were retired in the same step (design D5). `EXPECTED` still pins the behaviour.
- [x] 8.4 Record the consumer follow-ups. Verify that each one exists as a proposal or a noted task in its own repo:
  - the analytics app's `adopt-the-contract-package`
  - luxury-gardens' `add-analytics` revised to install the package
  - open-waters' move from its pasted v1
  - Recorded 2026-09-23. The analytics app has the `adopt-the-contract-package` proposal, and luxury-gardens' `add-analytics` is revised. open-waters has a noted follow-up in its AGENTS.md "Analytics" section, blocked on the package offering heatmaps per site, because open-waters turns them on and the package forces them off.

## 9. The gate

- [x] 9.1 Run `pnpm run ci:quality` and report its real output. Verify that it passes, with no task ticked on a failing run.
  - 2026-09-23, from a clean `dist/`: generated files current, eslint and tsc clean, 6 files and 43 tests passed, Prettier clean, build done. Eager `/browser` entry 1,879 bytes gzipped; posthog-js chunk after idle 101,376 bytes gzipped.
