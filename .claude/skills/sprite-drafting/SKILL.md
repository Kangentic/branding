---
name: sprite-drafting
description: The Kangentic pixel-art mascot/sprite harness - how to draft, refine, and export the Overseer creature and other sprites with the canonical engine, the ASCII-map method, the review discipline, and the decision history of rejected creatures. Read before any mascot, sprite, creature, or pixel-art work.
---

# Sprite Drafting

How Kangentic's pixel-art mascot was drafted, and how to refine or pivot it
without re-learning everything. Sprites are authored as ASCII maps and
rendered to rect-grid SVG by `scripts/lib/sprite.mjs` - no drawing tools,
fully diffable, deterministic. The palette and the canonical Overseer map
live in the lib; no other file re-declares them.

## The chosen mascot: the Overseer

A soft **amber** blob (18 wide x 12 tall) with **three sparkle eyes** - it
watches all your agents at once, and the three eyes echo three board
columns - side arms out and three feet. Canonical map = `OVERSEER` in
`scripts/lib/sprite.mjs`; canonical asset = `assets/mascot/overseer.svg`.

- **Amber body, not rust, on purpose.** A rust-bodied critter reads one
  shade from Claude Code's terracotta icon, and Kangentic is
  agent-agnostic. The amber-body mascot is the one sanctioned exception to
  the design language's "amber never competes with rust at full weight"
  rule (see the `design-language` skill).
- **Mascot != brandmark.** The Overseer is site/product personality; the
  K brandmark (see `icon-drafting`) is the app icon. Keeping them separate
  is deliberate (Claude Code's Clawd-vs-starburst split).

## The engine (canonical scripts)

| Script | Purpose |
|--------|---------|
| `scripts/lib/sprite.mjs` | THE engine: token `PALETTE`, the canonical `OVERSEER` map, `rects()` / `buildSvg()`. Import from here; never re-declare. |
| `scripts/gen-sprites.mjs` | Writes `assets/mascot/overseer.svg` (canonical) + every alternate/retired pose to `exploration/mascot/`. `npm run gen:sprites`. |
| `scripts/gen-og.mjs` | The social share image (`resources/social/og-image.png`): pixel wordmark + the Overseer, no font dependency. `npm run gen:og`. |

## Conventions (enforced by `pixel-art-conventions.md`)

- Sprites are ASCII maps -> `buildSvg()` -> rect-grid SVG with
  `shape-rendering: crispEdges`. Never freehand SVG paths, never AI raster
  art.
- **<= 4 token colors per sprite**, all drawn from the `PALETTE` in the
  lib (amber body, ink eyes, cream sparkles; rust for alternates).
- **Integer pixel scaling only.** Fractional scale blurs the pixels and
  kills the craft. Consumers size the inline SVG by CSS (the viewBox is in
  grid units); rasters render at an integer `unit`.
- One character on the page. The Overseer appears at most once per page.
  Poses (blink frames, wave frames) are variations of ONE map, not new
  characters.
- Alt text always describes it plainly ("Pixel-art Kangentic mascot").

## Review discipline

- Preview at 16x nearest-neighbor (the `.png` next to each `.svg` in
  `exploration/mascot/`) to judge the actual pixels; never eyeball the 1x.
- Refine by editing the map character-by-character. Rows that must not
  move (a shared head/body across hop frames) stay byte-identical between
  poses so motion reads as motion, not a different creature.
- Judge friendliness and silhouette first - the mascot's whole job is
  warmth. If it reads scary, dark, or ambiguous, it fails.

## Decision history (do not re-litigate without new information)

Explored in `exploration/mascot/` and `archive/mascot-explorations/`:

- **Kangaroo** (the original animal mascot, hop frames): retired in favor
  of an abstract creature that ties to the product (a board, not an
  animal).
- **Arcade borrowings** - invader, chomper/pacman, cursor, rocket, plain
  block-with-eyes: collide with OpenClaw, Pac-Man, Claude Code's icon.
- **Board creature** (`board-creature`, the kanban board come alive): a
  strong runner-up, kept viable.
- **Rust Overseer**: one shade from Claude Code's terracotta -> went amber.
- **Color studies** - ochre (dull), ink (scary/dark), amber+ink-outline
  (outline swallows the silhouette), marshmallow, shaded/shadow variants:
  all lost to plain **amber**, which is friendly and reads at any size.

## Where the mascot lives

- `assets/mascot/overseer.svg` - the canonical inline mascot (consumers
  embed this; it is theme-agnostic amber on transparency).
- `resources/social/og-image.png` - the share image built from it.
- `exploration/mascot/` - alternates and retired poses (reference).
- `archive/mascot-explorations/` - the full creature exploration (concept
  rounds, the superseded mascot-based icon sets, legacy logo candidates)
  so the progression is never lost.
