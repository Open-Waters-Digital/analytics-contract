## 1. Prerequisite

- [ ] 1.1 Confirm that `create-the-package` has been archived, so that `openspec/specs/browser-capture/` exists for this change's MODIFIED requirement. Verify with `npx openspec validate add-heatmaps-option --strict`, which should show no "target spec does not exist" notice.

## 2. The option

- [ ] 2.1 Add `heatmaps?: boolean` to `AnalyticsConfig` in `src/browser.ts`. Its comment should say that it is per-client, aggregate only, and recorded in the site's AGENTS.md. Pass `capture_heatmaps: config.heatmaps === true` to `posthog.init`. Verify that `pnpm run typecheck` passes, and that the parity tests still pass unchanged against the reference.
- [ ] 2.2 Confirm from posthog-js 1.433's source that an explicit `capture_heatmaps` overrides the remote project setting, whether true or false. Verify by recording the file and the behaviour, with the version, in a comment beside the option (design D3).
- [ ] 2.3 Write package-only tests (design D4). Verify each of these:
  - absent and `false` give `capture_heatmaps: false`
  - `true` gives `true`, with cookieless mode, person profiles and session recording unchanged
  - the string `"true"` passed through a cast gives `false`
  - with `heatmaps: true`, an objection or an empty key imports nothing
  - `regulated: true` with `heatmaps: true` keeps both mask options on
- [ ] 2.4 Run `pnpm run measure`. Verify that the eager entry grew by no more than a few bytes, and that the posthog-js chunk did not grow. Record both in the README.

## 3. Documents and release

- [ ] 3.1 Add the option to the README's wiring and a line on what turning it on requires, and add the next minor's `CHANGELOG.md` entry. Verify with `pnpm run format:check`.
- [ ] 3.2 Edit the skill in `~/.agents`, and commit there. Verify by rereading the diff.
  - The decisions table's heatmaps row names `heatmaps: true`.
  - The Next.js and Astro wiring shows the option, commented out.

  If `create-the-package`'s task 8.3 has not yet moved the skill onto the package, make this edit as part of that one.
- [ ] 3.3 Revise the analytics app's `add-provisioning` (planning only), per design D3: `uses_heatmaps` on sites, the required heatmaps setting following it, and the site form's checkbox. Verify with `npx openspec validate add-provisioning --strict` in that repo.
- [ ] 3.4 Update open-waters' AGENTS.md follow-up note: it is unblocked, and should pass `heatmaps: true`. Verify by rereading the note.

## 4. The gate

- [ ] 4.1 Run `pnpm run ci:quality` and report its real output. Verify that it passes, with no task ticked on a failing run.
