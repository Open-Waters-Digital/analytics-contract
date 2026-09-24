## 1. Prerequisite

- [x] 1.1 Confirm that `create-the-package` has been archived, so that `openspec/specs/browser-capture/` exists for this change's MODIFIED requirement. Verify with `npx openspec validate add-heatmaps-option --strict`, which should show no "target spec does not exist" notice.
  - `create-the-package` was archived on 2026-09-23. Strict validation shows no missing-spec notice.

## 2. The option

- [x] 2.1 Add `heatmaps?: boolean` to `AnalyticsConfig` in `src/browser.ts`. Its comment should say that it is per-client, aggregate only, and recorded in the site's AGENTS.md. Pass `capture_heatmaps: config.heatmaps === true` to `posthog.init`. Verify that `pnpm run typecheck` passes, and that the parity tests still pass unchanged against the reference.
  - Typecheck is clean, and the parity scenario passes unchanged.
- [x] 2.2 Confirm from posthog-js 1.433's source that an explicit `capture_heatmaps` overrides the remote project setting, whether true or false. Verify by recording the file and the behaviour, with the version, in a comment beside the option (design D3).
  - posthog-js 1.433.10, `lib/src/heatmaps.js`, `Heatmaps.isEnabled`: a non-nullish `capture_heatmaps` decides (`!== false`). `_enabledServerSide`, the project setting, is read only when it is unset. Recorded in the comment beside the option.
- [x] 2.3 Write package-only tests (design D4). Verify each of these:
  - absent and `false` give `capture_heatmaps: false`
  - `true` gives `true`, with cookieless mode, person profiles and session recording unchanged
  - the string `"true"` passed through a cast gives `false`
  - with `heatmaps: true`, an objection or an empty key imports nothing
  - `regulated: true` with `heatmaps: true` keeps both mask options on
  - Seven tests. A mutation to `Boolean(config.heatmaps)` fails the string case.
- [x] 2.4 Run `pnpm run measure`. Verify that the eager entry grew by no more than a few bytes, and that the posthog-js chunk did not grow. Record both in the README.
  - The eager entry went from 1,879 to 1,884 bytes gzipped (+5). The posthog-js chunk is unchanged at 101,376 bytes. Recorded in the README and the changelog.

## 3. Documents and release

- [x] 3.1 Add the option to the README's wiring and a line on what turning it on requires, and add the next minor's `CHANGELOG.md` entry. Verify with `pnpm run format:check`.
  - Version set to 1.1.0, with the changelog entry. The 1.0.0 entry is now dated 2026-09-23.
- [x] 3.2 Edit the skill in `~/.agents`, and commit there. Verify by rereading the diff.
  - The decisions table's heatmaps row names `heatmaps: true`.
  - The Next.js and Astro wiring shows the option, commented out.

  If `create-the-package`'s task 8.3 has not yet moved the skill onto the package, make this edit as part of that one.
  - Committed as `~/.agents` `2bdd5ea`, which names the release (1.1.0 and later).
- [x] 3.3 Revise the analytics app's `add-provisioning` (planning only), per design D3: `uses_heatmaps` on sites, the required heatmaps setting following it, and the site form's checkbox. Verify with `npx openspec validate add-provisioning --strict` in that repo.
  - In the analytics app: the proposal, the spec (with a scenario), the design D2 and the tasks, including the column and the checkbox. It validates with `--strict`. Uncommitted, like that repo's other plans.
- [x] 3.4 Update open-waters' AGENTS.md follow-up note: it is unblocked, and should pass `heatmaps: true`. Verify by rereading the note.
  - open-waters AGENTS.md: unblocked, wiring `heatmaps: true`, and the Renovate extends. Uncommitted in that repo.

## 4. The gate

- [x] 4.1 Run `pnpm run ci:quality` and report its real output. Verify that it passes, with no task ticked on a failing run.

  - 2026-09-24, from a clean `dist/`: generated files current, lint and tsc clean, 6 files and 50 tests passed, Prettier clean, build done. Eager entry 1,884 bytes gzipped.