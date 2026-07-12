# Kangentic Branding

Single source of truth for Kangentic brand assets, consumed by
[kangentic.com](https://github.com/Kangentic/kangentic.com) (website),
[kangentic](https://github.com/Kangentic/kangentic) (desktop app), and
kangentic-mobile. Icons change HERE, a release ships, consumers update.
Never edit brand assets inside a consumer repo, and never hand-edit a
generated file in this one - fix the script and regenerate.

## Tech Stack

- Plain Node ESM scripts + **sharp** (the only dependency)
- Published as **@kangentic/branding** on npm (`files`: assets, resources)

## Project Structure

```
scripts/lib/mark.mjs      THE mark geometry: frozen K path, cuts, tight card,
                          F4k glyph, knockout/square builders, tier picker.
                          The only place geometry may be declared.
scripts/gen-brandmark.mjs Exploration harness + canonical SVG exports (npm run gen)
scripts/gen-icons.mjs     Production resources/ tree (npm run gen:icons)
scripts/bash-guard.js     PreToolUse hook (single-command Bash rule)
assets/                   Canonical marks: brandmark.svg (>=48px card-K),
                          brandmark-small.svg (<48px F4k), brandmark-filled.svg
resources/                Production tree: web/, desktop/, mobile/ - every
                          size/type each surface needs (see resources/README.md)
archive/v1/               The blue-K brand, frozen verbatim. Never touch.
exploration/              Concept renders + review contact sheets
CHANGELOG.md              Release log (managed by /release)
```

## Key Conventions

- **Two-tier mark**: below 48px the F4k board glyph, 48px and up the
  card-K. `partsFor(size)` in `lib/mark.mjs` encodes it; ICO/ICNS mix
  tiers by entry. The mark must be unmistakable at 24x24.
- **Versioning = brand generation**: package major tracks the brand line
  (v1 blue K archived in `archive/v1/`, v2.x = Warm Craft). Minor/patch
  for refinements within the line. A major bump REQUIRES archiving the
  outgoing line first - `/release` enforces this. Brand history is never
  lost.
- **Determinism gate**: generated output is committed; `/release` reruns
  both generators and fails if `assets/` or `resources/` change. Date/
  random calls are banned in generators.
- **The frozen K**: the glyph is baked path data (Microsoft Tai Le Bold,
  extracted once via WPF). Never render brandmark text with `<text>`.
- Read the `icon-drafting` skill before ANY mark work; read
  `design-language` before any visual/color decision. The decision
  history in `icon-drafting` is binding - do not re-litigate rejected
  directions without new information.

## Development

```bash
npm install
npm run gen        # exploration sheets + canonical assets/
npm run gen:icons  # production resources/ (web, desktop, mobile)
```

## Skills

| Skill | Purpose |
|-------|---------|
| `icon-drafting` | The brandmark harness: canonical scripts, frozen K, two-tier system, review discipline (size strips + in-situ header renders), decision history. Read before any mark work. |
| `design-language` | The Warm Craft constitution: palette, typography, mascot conventions, anti-AI-template checklist. Kept in sync with kangentic.com's copy. |
| `release` | `/release [patch|minor|major]`: determinism gate, bump, changelog, tag, GitHub release, npm publish. Major = new brand generation only (archive gate). |

## Bash Convention

All Bash calls must be **single commands** - no `&&`, `||`, pipes, or `;`
chaining, enforced by the `scripts/bash-guard.js` PreToolUse hook (register
it in `.claude/settings.json` like kangentic.com does). Use separate Bash
calls or dedicated tools (Read, Grep, Glob) instead.
