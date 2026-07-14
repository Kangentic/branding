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
| `scripts/gen-sprites.mjs` | Writes `assets/mascot/overseer.svg` + the animation pose frames + the fly-in overture set (canonical), plus every alternate/retired pose and the animation preview to `exploration/mascot/`. `npm run gen:sprites`. |
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

## Animation frames

The blink/wave poses ship as canonical frames next to the rest pose so
consumers can animate the mascot without redrawing it:

- `assets/mascot/overseer-blink.svg` - all three eyes closed (row 3 of
  the map closes; the row-4 ink line reads as shut lids).
- `assets/mascot/overseer-wave.svg` - the viewer-right arm lifted one
  row (rows 4-5), keeping its 2x2 size; the hand peaks at the lower eye
  line, never above it. The wave is a 2-pose toggle (rest <> wave).
  Tuned at the live review, 2026-07-13: beside-the-head and eye-level
  arms both read too high on the body, and a rows-4-6 smear mid-frame
  read as the hand growing, so the pose count settled at two. Do not
  re-raise the arm or re-add a stretch frame without new information.

Rules for frames (mechanically enforced by `assertPose` in
`scripts/gen-sprites.mjs`):

- A frame is a variation of the ONE canonical map: same 18x12 grid, and
  every row it does not animate stays byte-identical to `OVERSEER`, so
  frames overlay pixel-perfectly and motion reads as motion, not a
  different creature.
- Frame maps are declared once, in `scripts/lib/sprite.mjs`
  (`OVERSEER_BLINK`, `OVERSEER_WAVE`).
- Alt text on every frame stays exactly "Pixel-art Kangentic mascot".

Sequencing is consumer-side and stepped, never tweened (the motion
budget in `design-language`): blink as an occasional idle loop (closed
~120ms every 4-6s), wave as a one-shot on load or hover (rest > wave >
rest > wave > rest at ~120ms per step). `prefers-reduced-motion` rests
on the canonical frame. `exploration/mascot/animation-preview.html` is
the live reference recipe.

## The fly-in overture set

The first-visit load sequence on kangentic.com (sanctioned by maintainer
decision, 2026-07-13; the constitution amendments live in
`design-language`) ships four more frames next to the Overseer's:

- `assets/mascot/overseer-ufo.svg` - the composite (26x11): the Overseer
  riding the saucer inside a glass bubble canopy (a 1px rust arc with a
  clear air row above the crown and a two-pixel air channel down the
  sides; rust, not cream, because cream is the page ground color and
  cream "glass" pixels would vanish on it). The bubble base is as wide as
  the hull rim, so the canopy closes flush onto the vehicle. The rider
  rows are derived from canonical `OVERSEER` rows 0-4 at build time
  (centered, 4 transparent columns each side, two rows below the bubble
  apex), so the rider can never drift from the canonical map; the hull
  occludes rows 5-11. Label: "Pixel-art UFO carrying the Kangentic
  mascot".
- `assets/mascot/ufo.svg` - the empty saucer (same 26x11 grid) for the
  departure after the Overseer disembarks; the bubble canopy belongs to
  the vehicle and stays. The hull and bubble rows are shared `SAUCER` /
  `BUBBLE` consts in the lib, byte-identical across both frames. The UFO
  is a PROP, not a character: rust body (rust is the brand accent), four
  cream port lights, no eyes, no face. Label: "Pixel-art empty UFO".
- `assets/mascot/minion.svg` + `assets/mascot/minion-run.svg` - the
  minion (8x7), one of the Overseer's agents: amber body, ONE ink+cream
  sparkle eye (the parent's exact 2x2 eye unit), two feet. The run is a
  2-pose toggle (rest <> run) changing row 6 only (the feet splay into a
  stride). Symmetric on purpose so one sprite runs both directions. Both
  frames share the label "Pixel-art Kangentic agent minion".

Choreography is binding, not a suggestion: 11 minions (one per agent CLI
in the proof line) spawn at scattered times, leap out diagonally in
mixed directions at varied speeds and ground lines, and within each
direction later spawns run slower so nobody overtakes mid-stage; the
crowd must NEVER read as a Space Invaders grid. All translation is
stepped in whole grid-unit hops at one shared integer display unit; pose
swaps stay in the 120ms family. The fly-in scene in
`exploration/mascot/animation-preview.html` is the consumer contract: on
the site it runs once per visitor (sessionStorage), in an aria-hidden
overlay with pointer-events none and zero layout shift, and under
prefers-reduced-motion only the resting Overseer renders. Minions and
the UFO appear only inside this sequence, never standalone.

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
- **UFO fly-in overture** (maintainer decision, 2026-07-13): a UFO
  sanctioned as a PROP carrying the Overseer for the one-shot first-visit
  load sequence, plus 11 minion sprites (one per agent CLI in the proof
  line). This does not reopen the rejected arcade borrowings: the UFO is
  a vehicle, not a character candidate, and the crowd must never read as
  an invader grid (staggered spawns, mixed directions, varied speeds and
  ground lines are binding).

## Where the mascot lives

- `assets/mascot/overseer.svg` - the canonical inline mascot (consumers
  embed this; it is theme-agnostic amber on transparency).
- `assets/mascot/overseer-{blink,wave}.svg` - the animation pose frames
  (same grid; consumers sequence them).
- `assets/mascot/overseer-ufo.svg`, `assets/mascot/ufo.svg`,
  `assets/mascot/minion.svg`, `assets/mascot/minion-run.svg` - the
  fly-in overture set (see above).
- `resources/social/og-image.png` - the share image built from it.
- `exploration/mascot/` - alternates, retired poses, and
  `animation-preview.html` (reference).
- `archive/mascot-explorations/` - the full creature exploration (concept
  rounds, the superseded mascot-based icon sets, legacy logo candidates)
  so the progression is never lost.
