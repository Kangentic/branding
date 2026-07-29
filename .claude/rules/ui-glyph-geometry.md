---
paths:
  - "scripts/**"
  - "assets/ui/**"
---

# Rule: ui glyph geometry lives only in scripts/lib/ui-glyphs.mjs

The ui set is the NAVIGATION marks the desktop app, the mobile app and the
website all render. It exists because kangentic-mobile needed a Board tab icon
and found that SF Symbols ships no kanban glyph: the catalogue was searched for
`kanban`, `board`, `column` and `lane`, and the only `column` hits are
`building.columns`, a bank facade. The nearest shapes are generic split
rectangles that read as "split view", and beside Android's Material
`view_kanban` they looked like a different product.

So mobile rasterised its own, and immediately grew a private pipeline for it: a
build script, a checked-in PNG set, a unit test and an extra devDependency, all
of which existed only because no package owned the glyph. Meanwhile Android
rendered a DIFFERENT kanban icon. That is the three-way drift the activity set
was created to end, starting over in a new place.

## The rule

- All ui glyph geometry is DECLARED once, in `scripts/lib/ui-glyphs.mjs`. Every
  generator imports from it and declares none of its own.
- **The grid is IMPORTED, never restated.** `VIEW`, `INK_BOX`, `INK_MIN`,
  `STROKE` and `LEGIBILITY_FLOOR_PX` come from `lib/activity.mjs`. A ui glyph
  and an activity mark share one 24 grid, one 18-unit layout slot and stroke 2,
  so they sit level in the same row. Declaring a second copy of those numbers is
  the drift this repo's single-source rules exist to prevent, and
  `npm run check` fails on it.
- **The slot fixes width, not height.** Every outline spans x 3 to 21 - the
  activity set's INDICATOR keyline, which every ui glyph sits on (that set's
  controls take a wider one, and nothing here is a control). Width is what
  aligns a row of icons the way an advance aligns a line of type.
  Within the slot a form is sized OPTICALLY rather than stretched to a shared
  rectangle, per `activity-icon-geometry.md`. The kanban frame is square, so its
  slot and its box coincide; a future ui glyph need not be square.
- **`currentColor` only. Never a hex.** Same reason as the activity set: the
  three consumers do not share foreground token values, and a hex would pick one
  surface's palette for all of them. Tone is the consumer's to apply.
- **No state, no motion.** These are navigation marks. A glyph that needs an
  idle/working pair or a dash belongs in the activity set, which already owns
  that contract. Nothing here carries `pathLength`, because that attribute
  exists to normalize a dash and nothing here moves.
- **Never rasterize the currentColor master.** librsvg (the renderer behind
  sharp) has no cascade to resolve `currentColor` against, so the result is
  unspecified and has drifted between versions. `glyphRasterSvg()` rebuilds the
  same geometry with an explicit hex; only that reaches sharp.
- **iOS tab rasters are TEMPLATE images and must be alpha-only.** UIKit discards
  every color channel and renders the alpha channel in the bar's tint, so an
  opaque background survives as a tinted block filling the tab slot. The rasters
  ship as pure white on transparency, and `gen-ui.mjs` asserts it rather than
  trusting it. This failure is invisible in this repo: it first appears in a
  store screenshot.
- **Raster sizes and stroke are keyed to the iOS tab bar.** 25pt at 1x/2x/3x,
  stroke 2, chosen for that surface against a 2.5 variant and a filled-lane
  variant. If another surface wants a different optical weight, that is a
  VARIANT, not a replacement: changing these invalidates the store screenshots
  captured against them.
- Iterate in named constants (`FRAME_R`, `LANE_X`, `LANE_TOP`, `LANE_END`),
  never ad-hoc numbers at a call site. A radius under review keeps an entry in
  `FRAME_R_ALTERNATES` with its reason rather than living as a magic number in
  the review sheet.
- **Proportions may follow an icon library; path data may not be copied.** The
  activity set's blanket "no glyph comes from an icon library" does not govern
  here, because a navigation glyph has a shape users already recognise and
  inventing a novel kanban mark would cost legibility for nothing. What carries
  over is the METHOD: take the proportions, redraw them on this repo's ink box,
  and record the derivation. `THIRD-PARTY-NOTICES.md` names the source and its
  licence.

## Enforcement (self-maintaining)

- **Gate (blocking):** `npm run check`'s `UI` check. It globs `assets/ui/*.svg`
  rather than enumerating them, so a new glyph cannot be invisible to it, and its
  strongest assertion is behavioural: the shipped SVG bytes and `ui.json` must
  equal what `lib/ui-glyphs.mjs` produces, so a hand-edit or a stale commit fails
  there rather than at the next regeneration. It also enforces the grid,
  `currentColor`, that every declared iOS raster EXISTS, that no undeclared SVG
  sits in the directory, and that no file outside the lib re-declares a named
  geometry constant.
- **Generator assertion (blocking):** `gen-ui.mjs` verifies every tab raster is
  alpha-only white on transparency before writing it, and throws otherwise. It
  lives there rather than in the checker because it needs sharp, and the checker
  is deliberately sync and dependency-free.
- **Release gate (blocking):** `npm run gen:ui` runs in the determinism gate
  alongside the other generators, and CI runs `npm run check`.

## Scope

`scripts/**` and `assets/ui/**`. This is a FOURTH visual vocabulary, distinct
from the brandmark (`lib/mark.mjs`, knockout-disc geometry), the mascot
(`lib/sprite.mjs`, pixel-art rect grids) and the activity set
(`lib/activity.mjs`, status marks with a motion contract). The pixel-art rule's
ban on freehand `<path>` governs sprites, not these: a stroked navigation glyph
is not illustration. Review artifacts under `exploration/ui/` are exempt from
byte determinism.

Do not name a ui glyph `board`. The F4k brandmark is already documented
throughout this repo as "the board glyph", and two different assets under one
name is exactly the ambiguity these rules exist to prevent.
