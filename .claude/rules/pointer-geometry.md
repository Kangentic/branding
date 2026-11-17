---
paths:
  - "scripts/**"
  - "assets/pointer/**"
---

# Rule: the demo pointer lives only in scripts/lib/pointer.mjs

The demo pointer is the dot that stands in for a mouse over a scripted demo:
kangentic.com's hero clicks with it, and the app's web demo walks it through
every choreographed scene. Until 2026-11-17 those were two different drawings,
the hero's dot and the demo's accent arrow, and the plan to unify them had each
consumer keeping its own copy of the dot. That is the three-way drift the
activity set was created to end, starting over in a new place. So the dot, its
ring and its click ship from here, and each consumer keeps only where the pointer
goes and when.

Every number in the set comes from app #1096's Design canvas, signed off
2026-11-17 (picks 1B, 2B, 3A, 4B, 5A, 6). The lib's header and each constant's
comment name the artboard it was drawn on, so a later change traces a value to
the sign-off and not to a consumer's file.

## The rule

- All pointer geometry and motion is DECLARED once, in
  `scripts/lib/pointer.mjs`. Every generator imports from it and declares none
  of its own. The two palette tokens it needs (`CREAM`, `INK`) are imported from
  `lib/mark.mjs`, never restated.
- **Page pixels, not frame pixels.** Every length is page px at host scale 1.
  The demo's frame is shown at 0.45 in docs figures and 0.44 to 0.77 across the
  tours, and a frame cannot measure the transform its host puts on it, so the
  host posts its scale `s` and the frame divides every length in
  `units.divideByHostScale` by it (D1 B). That list names the ring's stroke
  explicitly: it is `non-scaling-stroke`, so sizing the ring's svg does not carry
  it along, and a consumer that forgot it would draw a 0.68px ring in a docs
  figure.
- **`currentColor` only. Never a hex in an svg.** The consumer tints it cream or
  ink. The tones' hexes and halo weights ship as DATA in `pointer.json`, and the
  svg carries the default tone's weights as presentation attributes so consumer
  CSS overrides them per part.
- **No aura.** D2 B dropped the hero's 30px aura, the hero's included: at
  docs-figure scale it covered a filter pill and a half. `AURA` is declared
  `null` so the absence is a recorded decision rather than a gap.
- **The click ships as data, and no CSS ships.** The task allowed a stylesheet
  only if both consumers could use one, and neither can: the hero's click sits
  inside an eight-second infinite beat as percentages of it, and the demo
  animates with the Web Animations API at whatever moment its choreography
  presses. So `pointer.json` carries the tracks in the shape `element.animate()`
  takes, with each segment's easing on its keyframe (a CSS
  animation-timing-function eases per segment). The demo passes them straight
  through; the hero converts each offset into its beat.
- **A press is a STATE plus three tracks; a release is a state alone.** The core
  steps to 0.7 with no tween and holds until the release, which is what lets a
  drag's carry read as a held button (D5 A). The halo pops, and one ring runs
  out and STAYS where the press landed. A release draws no ring. How long a
  click's press is held (90ms in the demo) and the double-click gap (210ms) are
  the consumer's: they are when, not what.
- **The svg must serve inline animation literally.** The dot's viewBox holds the
  halo at the PEAK of its pop (`DOT_BOX`), because an inline `<svg>` clips to its
  viewBox and the 1.5x halo is 27px. Every animated part carries its own
  `transform-box: fill-box; transform-origin: center`, because a scale on an SVG
  child otherwise runs about the browser's default origin. The ring rests at
  opacity 0 and the manifest's `fillMode` is none, so a finished animation
  returns every part to rest by itself.
- **Never rasterize the currentColor master.** `pointerRasterSvg()` rebuilds the
  geometry with an explicit hex for the review sheets (the ui-glyphs precedent),
  and draws the ring at its diameter rather than scaling it, so the sheet does
  not depend on the renderer's `vector-effect` support.
- **A number drawn two ways on the canvas is settled by the maintainer and the
  pick is recorded.** The halo's pop was drawn 160ms up and 320ms back on the
  hero's artboard (D6) and 120ms up and 200ms back on the demo's (D3, D5). The
  maintainer picked the hero's on 2026-11-17; the lib's PROVENANCE says so.
- Iterate in named constants (`CORE_D`, `HALO_D`, `RING_FROM`, `POP`), never an
  ad-hoc number at a call site.

## Enforcement (self-maintaining)

- **Gate (blocking):** `npm run check`'s `POINTER` check. Its strongest assertion
  is behavioural: both svgs and `pointer.json` must equal what the lib produces,
  so a hand-edit or a stale commit fails there. It also fails on a CSS file or
  any undeclared file in `assets/pointer/`, a hex in either svg, a ring that is
  not a 1.5px `non-scaling-stroke`, and a re-declared pointer constant outside
  the lib.
- **Gate (blocking): the consumption contract.** Byte equality cannot see a
  regression that was REGENERATED, so the same check reads the geometry from the
  lib and the contract from the SHIPPED json: the ring must start outside the
  halo, the dot's box must hold the popped halo, every animated part must
  declare and carry a transform origin, `divideByHostScale` must name both boxes
  and the ring stroke, every track's offsets must ascend from 0 to 1 with no fill
  mode, every event must resolve to a declared state or track, a reduced-motion
  rendering must be declared, every tone must be a brand token, and the svg's own
  weights must be the default tone's.
  - Verified to bite 2026-11-17, three ways. A hand-edit of the shipped core
    (`r="4"` to `r="5"`) reports:

    ```
    POINTER   FAIL
        - assets/pointer/pointer.svg: drifts from lib/pointer.mjs output (regenerate, never hand-edit)
    ```

    Then, with byte equality made to pass by REGENERATING, `RING_FROM` set to
    0.24 and `ring.strokeWidth` dropped from `DIVIDE_BY_HOST_SCALE` report:

    ```
    POINTER   FAIL
        - lib/pointer.mjs: the ring starts at 17.28px, inside the 18px halo (it must leave the halo's edge)
        - pointer.json: units.divideByHostScale omits ring.strokeWidth, so a scaled frame following it draws the wrong size
    ```

- **CI gate (blocking):** `npm run gen:pointer` runs in the determinism gate
  alongside the other generators, on every pull request and every push to
  `main`, and again on the version tag in `publish.yml`.
- **Review:** whether the manifest still reproduces the signed-off click when
  followed literally is checked by driving the shipped files in a browser, as
  the closing before/after page for this set did. That is review, not a gate.

## Scope

`scripts/**` and `assets/pointer/**`. This is a FIFTH visual vocabulary,
distinct from the brandmark (`lib/mark.mjs`), the mascot (`lib/sprite.mjs`),
the activity set (`lib/activity.mjs`) and the ui glyphs (`lib/ui-glyphs.mjs`). It
is not an icon on the 24 grid, so that grid's keylines, stroke 2 and pixel
lattice do not govern it, and it is not illustration, so the pixel-art rules do
not either. Review sheets under `exploration/pointer/` are exempt from byte
determinism.

kangentic-mobile does not consume this set, and its rect-only renderer (the
reason the activity set paints solids only as rects) never sees it:
`syncBranding.mjs` reads `assets/activity/` and `assets/mascot/` by explicit
path, never a glob over `assets/`, checked 2026-11-17. The pointer's circles
carry their own fill and stroke, so if mobile ever globs `assets/`, it must
exclude `assets/pointer/`.
