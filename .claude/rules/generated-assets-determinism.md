# Rule: assets/ and resources/ are generated, never hand-edited

Consumers (kangentic.com, the desktop app, kangentic-mobile) ship the
committed contents of `assets/` and `resources/`. If a committed asset
drifts from what the harness produces, a release ships something no script
can reproduce, and the next regeneration silently reverts it.

## The rule

- Never hand-edit a file in `assets/` or `resources/`. To change an
  asset, change the generator (or the `scripts/lib/` source behind it) and
  rerun the generators. The `npm run gen*` scripts are listed in
  `package.json`; do not rely on a copy of that list here.
- Generators must be DETERMINISTIC: no `Date.now()`, no `Math.random()`,
  no argless `new Date()`, no network. Same inputs, byte-identical output.
- Regenerated output is committed alongside the script change, in the same
  commit - never a script change without its regenerated assets.

## Enforcement (self-maintaining)

- **CI gate (blocking):** `.github/workflows/ci.yml`'s `Determinism gate` job
  reruns the generators and fails if `git status` shows any change under
  `assets/` or `resources/`. It runs on every pull request and every push to
  `main`, and it is the required status check on `main`, so a hand-edit or a
  stale commit cannot MERGE, not merely cannot ship.
- **Publish gate (blocking):** `publish.yml` reruns the same regeneration and
  drift check on the `v*` tag push, before `npm publish`. Nothing reaches npm
  without passing it.
- **Local pre-flight:** `/release` Step 1 and `/pull-request` Step 0 run the
  same regeneration before the tag or the push, so drift is normally caught on
  the machine that caused it rather than in CI. These are skill steps, not
  gates: only the two above can block anything.

## Scope

`assets/**`, `resources/**`, and every generator that writes them (the
`scripts/gen-*.mjs` set, whose current membership is the `gen*` scripts in
`package.json`). Exploration renders under `exploration/` are review
artifacts, not shipped assets, and are not held to byte-determinism -
`gen-review.mjs` is the one generator neither workflow runs, for that reason.
