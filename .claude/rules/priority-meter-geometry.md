---
paths:
  - "scripts/**"
  - "assets/priority/**"
---

# Rule: the priority meter lives only in scripts/lib/priority.mjs

The priority meter is the row of equal bars a task's priority draws: one bar per
level above the scale's bottom entry, lit up to the task's level. The desktop app
draws it on every card and in every priority picker, its web demo draws the same
cards, and kangentic-mobile replaces its flag pill with it. When kangentic #1160
signed off the meter, its numbers lived in one desktop file and mobile still drew
an older design: the drift the kanban glyph and the activity set were brought
here to end, starting over in a new place. So the meter's numbers and rules ship
from here, and each consumer keeps only where it draws one.

It is not a fixed glyph. A user renames and extends the priority scale, so the
bar count follows the scale, and what ships is a RULE plus its numbers in
`meter.json`, with reference SVGs for the default five-level scale beside it.

## The rule

- All meter numbers and rules are DECLARED once, in `scripts/lib/priority.mjs`.
  Every generator imports from it and declares none of its own.
- **Layout pixels, snapped to whole device pixels.** Every number is CSS px on
  the desktop and the web, dp on the phone, at 1x. At any other scale a consumer
  rounds each of the bar width, the gap and the height ONCE to whole device
  pixels, half up, and draws every bar at those values (`pixelSnap()`,
  `meter.json`'s `pixelSnap`). Plain layout px leave the bars unequal at every
  fractional scale, because a renderer rounds each edge on its own. Half up is
  stated rather than left to a platform's `round()`, because 1.5x bar width (4.5)
  and 1.25x gap (2.5) are exact ties. The corner radius is not snapped.
- **The bar count is a rule, capped at 7 levels.** One bar per level above the
  bottom entry (`max(1, levelCount - 1)`), lit `min(max(level, 0), barCount)`
  from the left; a level past the end of the scale lights every bar. A
  consumer that lets a user add levels stops at `MAX_LEVELS` (7, six bars,
  28px). In kangentic that is the Priorities popover's Add Priority, which as of
  2026-11-22 does not enforce it yet: a follow-up there, not a fact here. A
  scale that is already longer still draws by the rule: the cap stops the scale
  growing, it does not truncate it.
- **`currentColor` only. Never a hex.** The meter has no color of its own: it
  draws in the level's color, as the project's user picked it, and a level past
  the end of the scale takes the consumer's fallback gray. A hex in the meter
  would pick one surface's palette for all three, the activity set's reason.
- **Rects only.** Each reference meter is `meter.json`'s bars drawn literally:
  one `<rect>` per bar, integer coordinates, the root's `currentColor`, and
  `fill-opacity` on unlit bars. They are a reference, not what every consumer
  renders: the phone draws Views from `meter.json` (see Scope).
- **A card draws nothing at level 0** and keeps no slot for it. A list or picker
  that names every level draws level 0 as every bar at `opacity.none`. The meter
  is decorative: the element around it carries the level's name.
- **Placement is part of the contract.** On a card the meter sits in the title
  row: title, #N, the meter, then the corner glyph (the desktop's globe, the
  phone's PR glyph).
- **A Design round renders with `--review`.** `node scripts/gen-priority.mjs
  --review` writes the review page and leaves `assets/` untouched, because a card
  in the Design column may not write `assets/`. The build runs it without the
  flag.
- Iterate in named constants (`BAR_W`, `BAR_GAP`, `BAR_H`, `UNLIT_OPACITY`,
  `MAX_LEVELS`), never an ad-hoc number at a call site. A rejected direction
  keeps its entry in `DECISIONS` with its dated reason.

## Decision history (do not re-litigate without new information)

The look is kangentic #1160's, signed off 2026-11-22 with picks 1A, 2B, 3B and
4B: the title row reads title, #N, meter, globe; a card with no priority keeps no
slot; four equal bars, 10px tall and 18px wide, the level shown by how many are
lit; and that meter replaces the rising one everywhere. The numbers are the 1160
worktree's `PriorityMeter.tsx`.

The contract is branding #24's, signed off the same day with **1B, 2A, 3 as
drawn, 4A, 5B** (review page: https://claude.ai/artifact/W55nZBExSYFcLmYoHbfRQN).
The owner named no picks of their own, so every decision took the page's
recommendation. `DECISIONS` in the lib carries the same record.

1. **Device pixels: B, whole device pixels.** Rejected A, layout pixels as #1160
   drew them: the bars paint unequal at every fractional scale, which defeats
   3B's equal bars on the usual Windows laptop settings. Measured in Chromium on
   2026-11-22 on a real title row (title, #N, then the span meter), CSS zoom
   standing in for the display scale:

   | scale | A, layout px | B, device px |
   |---|---|---|
   | 125% | 4 4 4 3 | 4 4 4 4 |
   | 150% | 4 5 4 5 | 5 5 5 5 |
   | 175% | 6 5 5 5 | 5 5 5 5 |

   Which bar comes out wide under A follows where the meter starts on the row.
   The phone's 2.75x and 3.5x are modeled from Yoga's edge rounding, not
   measured. The accepted cost of B: the meter's layout width moves with the
   scale (20 at 1.25x, 19.33 at 1.5x, against 18).
2. **The phone: A, the title row after #N**, the desktop's order. Rejected B,
   leading the labels row where the flag pill was: a card with no labels would
   still need the row, which #1146 removed on the desktop, and it breaks parity
   with the desktop's title row.
3. **The contract: as drawn.** `meter.json` (numbers, rules, `pixelSnap`,
   `maxLevels`, placement, level 0, accessibility, and two worked tables) plus
   `meter-0.svg` to `meter-4.svg` for the default scale.
4. **Color: A, the level's own color as its user picks it.** Rejected B, one
   fixed tone for every level: an Urgent card stops standing out from a Low one
   except by two bars, and it is a kangentic change (the picker goes,
   `PriorityBadge` stops reading the level's color) plus a phone change if the
   protocol drops the colors. Not drawn, and rejected on principle: a fixed
   per-level ramp owned by this package. It ships no color, only `currentColor`
   geometry, because each consumer tunes color to its own grounds
   (design-language).
5. **Scale length: B, a cap of 7 levels**, stated in `meter.json` for
   kangentic's Priorities popover to enforce (a follow-up there). Rejected A, no
   cap: the meter grows 5px per level, and a 15-level scale draws a 68px meter
   that crowds the title of a 224px card.

Superseded: **the rising meter** (bars from 5px to 14px, bottom-aligned), retired
by #1160 because its lit bars sat low on Low and Medium, so its ink did not share
a center with #N and the globe. `RISING` in the lib keeps it for the review's
before column.

Measured and recorded, not acted on:

- **The 10px height centers on the title.** In Chromium on Windows, system-ui at
  14px on a 20px line has its baseline at 15 and a capital height of 10, so the
  cap band is 5 to 15, exactly where a centered 10px meter sits. From their font
  metrics, SF Pro's cap band centers 0.04px low and Roboto's 0.19px high.
- **Medium on a light card is the weakest pair.** The default scale's Medium
  `#eab308`, lit against unlit, is 1.53:1 on the desktop's light card. An opacity
  cannot lift it far: the ceiling is the color itself, 1.84:1 on that card. The
  scale's colors are the project's data, not this package's.

## Enforcement (self-maintaining)

- **Gate (blocking):** `npm run check`'s `PRIORITY` check. Its strongest
  assertion is behavioural: the reference SVGs and `meter.json` must equal what
  the lib produces, so a hand-edit or a stale commit fails there, and nothing
  undeclared may sit in `assets/priority/`. It also fails a re-declared meter
  constant outside the lib.
- **Gate (blocking): the consumption contract.** Byte equality cannot see a
  regression that was REGENERATED, so the same check reads the SHIPPED json and
  re-derives everything a consumer relies on from the json's own numbers and
  stated rules. Every reference SVG must be `currentColor` with no hex, draw only
  rects, put each bar where `bar` and the rules put it, and carry the opacity the
  rules give. Both worked tables are recomputed: every `examples` row, and every
  `pixelSnap` row, which must be whole device pixels, rounded half up, with at
  least one exact .5 tie so half up is actually exercised. `maxLevels` must equal
  the lib's cap and appear in the examples, and the placement, level 0,
  accessibility and color guidance must be present.
  - Verified to bite 2026-11-22, three ways. A hand-edit of a shipped meter (an
    unlit bar's `fill-opacity` from 0.3 to 0.4) reports:

    ```
    PRIORITY  FAIL
        - assets/priority/meter-2.svg: drifts from lib/priority.mjs output (regenerate, never hand-edit)
    ```

    Then, with byte equality made to pass by REGENERATING, rounding half down in
    `pixelSnap()` reports one line per tie it moved, starting:

    ```
    PRIORITY  FAIL
        - meter.json: pixelSnap at 1.25x: device.gap is 2, but 2 x 1.25 rounded half up is 3
        - meter.json: pixelSnap at 1.25x: device.height is 12, but 10 x 1.25 rounded half up is 13
        - meter.json: pixelSnap at 1.5x: device.width is 4, but 3 x 1.5 rounded half up is 5
    ```

    And a reference meter whose first bar is a `<circle>`, regenerated, reports
    first, for each of the five files:

    ```
    PRIORITY  FAIL
        - meter-0.svg: draws a <circle>, but a bar is a <rect> (the reference meters are meter.json's bars drawn literally)
        - meter-0.svg: draws 3 bars, the rules give 4 for 5 levels
    ```

- **CI gate (blocking):** `npm run gen:priority` runs in the determinism gate
  alongside the other generators, on every pull request and every push to
  `main`, and again on the version tag in `publish.yml`.
- **Review:** whether a consumer that follows `meter.json` literally draws the
  signed-off meter, and whether the cap is enforced in kangentic's Priorities
  popover, are checked in the consumers. That is review, not a gate here.

## Scope

`scripts/**` and `assets/priority/**`. This is a SIXTH visual vocabulary,
distinct from the brandmark (`lib/mark.mjs`), the mascot (`lib/sprite.mjs`), the
activity set (`lib/activity.mjs`), the ui glyphs (`lib/ui-glyphs.mjs`) and the
demo pointer (`lib/pointer.mjs`). It is sized to a line of text, not to the 24
grid, so that grid's keylines, stroke 2 and outline lattice do not govern it; its
own lattice is the integer coordinates of its rects and the device-pixel snap.
It is not illustration, so the pixel-art rules do not govern it either. The
review page under `exploration/priority/` is exempt from byte determinism.

kangentic-mobile's `syncBranding.mjs` reads `assets/activity/` and
`assets/mascot/` by explicit path (checked 2026-11-17, `pointer-geometry.md`),
so it does not pick up `assets/priority/` by itself, and it must not: its
activity renderer strokes a rect that carries no `fill`/`stroke` attribute as an
OUTLINE and reads no `fill-opacity` (checked 2026-11-22), so a reference meter
run through it would draw four hollow boxes at one strength. The phone draws
Views from `meter.json`, as the desktop draws spans.
