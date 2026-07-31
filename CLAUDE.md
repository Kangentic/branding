# Kangentic Branding

Single source of truth for ALL Kangentic content assets - icons, the
mascot, the social image - consumed by
[kangentic.com](https://github.com/Kangentic/kangentic.com) (website),
[kangentic](https://github.com/Kangentic/kangentic) (desktop app), and
kangentic-mobile. Content changes HERE, a release ships, consumers update.
Never edit an asset inside a consumer repo, and never hand-edit a
generated file in this one - fix the script and regenerate.

## Tech Stack

- Plain Node ESM scripts + **sharp** (the only dependency)
- Published as **@kangentic/branding** on npm (`files`: assets, resources)

## Project Structure

```
scripts/lib/mark.mjs      THE mark geometry: frozen K path, cuts, tight card,
                          F4k glyph, knockout/square builders, tier picker.
scripts/lib/sprite.mjs    THE sprite engine: token palette, canonical Overseer
                          map, ASCII-map -> rect-grid SVG builder.
                          (Both libs: the only place their geometry is declared.)
scripts/lib/activity.mjs  THE activity icon geometry: one 18-unit layout slot on
                          a 24 grid with each form sized optically inside it,
                          stroke 2, currentColor; the nine shipped marks, the
                          retired candidates and envelope boxes with their dated
                          reasons, the march/spin motion contract, and
                          strokeCoverage(), the pixel-hinting scorer every
                          lattice claim is measured with. No glyph comes from an
                          icon library.
scripts/lib/ui-glyphs.mjs THE ui glyph geometry: the NAVIGATION marks (the
                          kanban board glyph today). Imports the activity set's
                          24 grid / 18-unit slot / stroke 2 rather than
                          restating it; no state, no motion. Proportions may
                          follow an icon library, path data is never copied -
                          see THIRD-PARTY-NOTICES.md.
scripts/lib/pixelfont.mjs THE 5x7 plate font (uppercase, narrow coverage);
                          word() throws on a glyph it does not have.
scripts/lib/feature-graphic.mjs  THE Play feature graphic composition (1024x500)
scripts/gen-brandmark.mjs Icon exploration harness + canonical SVGs (npm run gen)
scripts/gen-icons.mjs     Production icon tree -> resources/ (npm run gen:icons)
scripts/gen-sprites.mjs   Mascot -> assets/mascot/ + exploration (npm run gen:sprites)
scripts/gen-og.mjs        Social image -> resources/social/ (npm run gen:og)
scripts/gen-activity.mjs  Activity marks -> assets/activity/ + the candidate
                          review sheet, the size strips, and the one-mark-alone
                          isolation + pixel-truth sheets ->
                          exploration/activity/ (npm run gen:activity)
scripts/gen-ui.mjs        UI glyphs -> assets/ui/ + the iOS tab rasters ->
                          resources/mobile/ + review sheets ->
                          exploration/ui/ (npm run gen:ui)
scripts/gen-review.mjs    In-situ header mocks + the mobile-surface sheet ->
                          exploration/review/ (npm run gen:review); the
                          aesthetic sign-off artifacts, reviewed while the
                          change is being made
scripts/check-invariants.mjs  Mechanical brand-invariant gate (npm run check).
                          Checks, in run order: PALETTE, SPRITE, TIERING,
                          FROZEN-K, BANNED, MONO, ANIMATION, ACTIVITY, UI,
                          RECORD. RECORD asserts this list matches the checks
                          that actually run, so it cannot silently fall behind.
scripts/bash-guard.js     PreToolUse hook (single-command Bash rule)
assets/                   Canonical vectors: brandmark{,-small,-filled,-mono,
                          -mono-amber}.svg (icon; -mono/-mono-amber =
                          currentColor F4k for themed in-app chrome) +
                          mascot/overseer{,-blink,-wave}.svg
                          (mascot + animation pose frames) +
                          activity/*.svg + activity.{css,json} (the agent,
                          terminal and control status marks consumers render
                          in-app; currentColor, tinted by each surface) +
                          ui/*.svg + ui.json (the navigation glyphs: kanban.svg
                          is the Board mark for the mobile tab, the desktop app
                          and the website)
resources/                Production rasters consumers ship: web/, desktop/,
                          mobile/ (app icons incl. iOS dark/tinted, adaptive +
                          Android 13+ themed layers, notification icon, splash,
                          Play feature graphic, kanban-tab-{25,50,75}.png for
                          the iOS tab bar), social/og-image.png (see README)
archive/v1/               The blue-K brand, frozen verbatim. Never touch.
archive/mascot-explorations/  Every creature round, superseded mascot-icon
                          sets, and legacy logo candidates. Never touch.
exploration/              Icon contact sheets, mascot alternate/retired poses,
                          review/ in-situ header mocks + mobile-surface sheet
CHANGELOG.md              Release log (managed by /release)
```

## Key Conventions

- **Two-tier mark, keyed to DISPLAYED context (not raster size)**:
  card-K (the letter) where the mark shows large, F4k (the board glyph)
  where the OS shows it small. The line is whether the OS picks a
  size-specific entry or downscales one master: multi-resolution
  containers (.ico/.icns) and the desktop PNG ladder tier per entry
  (card-K >=128, F4k <=64); single-image masters the OS shrinks to chrome
  (store icons, PWA/apple-touch/manifest icons, favicons) stay F4k, or the
  installed icon becomes an illegible downscaled card-K. `markFor(size)`
  in `gen-icons.mjs`; `cardKParts()` / `f4kParts()` in `lib/mark.mjs`. The
  mark must be unmistakable at 24x24.
- **Versioning = brand generation**: package major tracks the brand line
  (v1 blue K archived in `archive/v1/`, v2.x = Warm Craft). Minor/patch
  for refinements within the line. A major bump REQUIRES archiving the
  outgoing line first - `/release` enforces this. Brand history is never
  lost.
- **Determinism gate**: generated output is committed; CI reruns the
  generators on every pull request and every push to `main` and fails if
  `assets/` or `resources/` change. `publish.yml` reruns it on the version
  tag before npm sees the package, and `/release` runs it locally first.
  Date/random calls are banned in generators.
- **The frozen K**: the glyph is baked path data (Microsoft Tai Le Bold,
  extracted once via WPF). Never render brandmark text with `<text>`.
- Read the `icon-drafting` skill before ANY mark work; read
  `design-language` before any visual/color decision. The decision
  history in `icon-drafting` is binding - do not re-litigate rejected
  directions without new information.

## Development

```bash
npm install
npm run gen          # icon exploration sheets + canonical brandmark SVGs
npm run gen:icons    # production icon tree -> resources/ (web, desktop, mobile)
npm run gen:sprites  # mascot -> assets/mascot/ + exploration/mascot/
npm run gen:og       # social image -> resources/social/og-image.png
npm run gen:activity # activity marks -> assets/activity/ + review sheet
npm run gen:ui       # ui glyphs -> assets/ui/ + iOS tab rasters + review sheets
npm run gen:review   # in-situ header mocks -> exploration/review/ (light + dark)
npm run check        # mechanical brand-invariant gate (roster in the file header)
```

## Skills

| Skill | Purpose |
|-------|---------|
| `icon-drafting` | The brandmark harness: canonical scripts, frozen K, two-tier system, review discipline (size strips + in-situ header renders), decision history. Read before any mark work. |
| `sprite-drafting` | The pixel-art mascot harness: the sprite engine, the ASCII-map method, review discipline, and the rejected-creature history. Read before any mascot/sprite work. |
| `design-language` | The Warm Craft constitution: palette, typography, mascot conventions, anti-AI-template checklist. Kept in sync with kangentic.com's copy. |
| `release` | `/release [patch|minor|major]`: determinism gate, bump, changelog, tag, GitHub release, npm publish. Major = new brand generation only (archive gate). |
| `pull-request` | Testing column: run the determinism gate locally, commit, rebase, open a clean PR, and drive its CI checks to green (auto-fixing generators/scripts). Never merges. |
| `merge-pull-request` | Merge column: verify a green PR, merge it (rebase, delete branch), realign the worktree, and fast-forward local `main`. Does NOT publish (that is `/release`). |

## Conventions

Enforceable standards live as focused, auto-loaded rules in
`.claude/rules/`. Claude Code loads them the way it loads this file: rules
without a `paths:` header load every session; rules with one load when a
matching file enters context. Each rule names its enforcement.

**Always-on rules:**
- `bash-single-command.md` - one command per Bash tool call; no `&&` `||` `|` `;` or redirects (enforced by the `scripts/bash-guard.js` hook).
- `text-formatting.md` - no em-dashes (U+2014) or `--` as punctuation in authored text.
- `no-personal-info.md` - no personal names, emails, or machine paths in committed code (repo is public); attribute decisions to roles and dates.

**Path-scoped rules (load with their subsystem):**
- `mark-geometry-single-source.md` - all mark geometry lives only in `scripts/lib/mark.mjs`; tier by displayed context (card-K in size-specific container entries >=128, F4k in every OS-downscaled master) (`scripts/**`).
- `activity-icon-geometry.md` - the activity set's geometry lives only in `scripts/lib/activity.mjs`; one 18-unit layout SLOT on a 24 grid with each form sized optically inside it (geometric parity is not optical parity), stroke 2, currentColor only, every outline extremum on the integer pixel lattice, motion ships as data plus CSS, and every candidate is reviewed alone as well as in adjacency (`scripts/**`, `assets/activity/**`).
- `ui-glyph-geometry.md` - the ui navigation set's geometry lives only in `scripts/lib/ui-glyphs.mjs`; it imports the activity grid rather than restating it, carries no state or motion, and its iOS tab rasters must be alpha-only template images (`scripts/**`, `assets/ui/**`).
- `pixel-art-conventions.md` - sprites are ASCII maps -> `lib/sprite.mjs` rect grids: crispEdges, <=4 palette colors, integer scale only, one canonical map (`scripts/**`).
- `brand-record-fidelity.md` - the record must match what the code does: status comments are re-read when the status changes, a stated rationale must survive measurement, a generated manifest must serve its documented consumption pattern, and a review artifact must render what its caption claims. Enforced by `/code-review` on the PR (`scripts/**`, `assets/**`, `.claude/skills/**`).
- `generated-assets-determinism.md` - `assets/` and `resources/` are generated, never hand-edited; generators are deterministic; the CI determinism gate enforces it (`assets/**`, `resources/**`, generators).

**Authoring a rule:** one concern per file, descriptive kebab-case name.
Keep always-on rules few (reserve them for universal, file-independent
conventions); everything subsystem-specific gets `paths:` frontmatter.
Structure: one-paragraph context, `## The rule`, `## Enforcement
(self-maintaining)`, `## Scope`. Name the strongest available enforcement,
in this order: the bash-guard hook blocks 100%; CI (`npm run check` plus the
determinism gate) runs on every pull request and every push to `main`; a
generator assertion fires whenever that generator is rerun; `/release` and
`publish.yml` are the last checks before a version ships; review is the
fallback. Prefer the highest rung a claim can reach, and say which rung it
got, since only CI blocks a merge. Add a one-line pointer to the index
above. Machine-specific overrides go in a gitignored `CLAUDE.local.md`.
