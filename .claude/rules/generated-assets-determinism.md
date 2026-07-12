# Rule: assets/ and resources/ are generated, never hand-edited

Consumers (kangentic.com, the desktop app, kangentic-mobile) ship the
committed contents of `assets/` and `resources/`. If a committed asset
drifts from what the harness produces, a release ships something no script
can reproduce, and the next regeneration silently reverts it.

## The rule

- Never hand-edit a file in `assets/` or `resources/`. To change an
  asset, change the generator (or `scripts/lib/mark.mjs`) and rerun
  `npm run gen` and `npm run gen:icons`.
- Generators must be DETERMINISTIC: no `Date.now()`, no `Math.random()`,
  no argless `new Date()`, no network. Same inputs, byte-identical output.
- Regenerated output is committed alongside the script change, in the same
  commit - never a script change without its regenerated assets.

## Enforcement (self-maintaining)

- **Release gate (blocking):** `/release` reruns both generators and
  fails if `git status` shows any change under `assets/` or `resources/`.
  A hand-edit or a stale commit is caught there before a version ships.

## Scope

`assets/**`, `resources/**`, and the generators that write them
(`scripts/gen-brandmark.mjs`, `scripts/gen-icons.mjs`). Exploration
renders under `exploration/` are review artifacts, not shipped assets, and
are not held to byte-determinism.
