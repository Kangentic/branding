# Rule: pixel-art sprites follow the crisp-grid conventions

The mascot earns its "craft object" role only if the pixels stay crisp and
the palette stays disciplined. Freehand paths, AA blur from fractional
scaling, or a fifth color turn it into generic clip-art.

## The rule

- Sprites are authored as ASCII maps and rendered through
  `scripts/lib/sprite.mjs` (`buildSvg()` / `rects()`) to rect-grid SVG
  with `shape-rendering: crispEdges`. Never freehand SVG paths for a
  sprite; never AI raster art.
- **<= 4 token colors per sprite**, all from the `PALETTE` in the lib
  (amber, rust, ink, cream). No off-palette hexes.
- **Integer pixel scaling only.** Rasters render at an integer `unit`;
  inline SVGs carry a grid-unit viewBox and are sized by CSS. Never scale
  a sprite by a fractional factor.
- The palette, the canonical `OVERSEER` map, the pose maps, and the
  animation `SEQUENCES` are declared ONCE in `scripts/lib/sprite.mjs`.
  Generators import them; they do not re-declare.
- **Animation timings ship, they are not re-authored in a consumer.**
  Sequences and their durations are generated into
  `assets/mascot/animations.json` (data) and `assets/mascot/animations.css`
  (a drop-in stepped swap). A consumer reads those; it never hardcodes a
  duration. This is the rule that stops the three-way drift that already
  happened once between the website, the mobile app, and this repo.
- The Overseer is the one character, at most once per page, always with
  plain alt text. Poses are variations of one map, not new creatures.

## Enforcement (self-maintaining)

- **Gate (blocking):** `npm run check`'s `ANIMATION` check reads
  `animations.json` and enforces the motion budget (<= 4 distinct frames
  per sequence), that every sequence declares `reducedMotion` and names
  frames that exist, that every frame a sequence touches has a CSS track
  (so a pixel-vacating pose cannot let the rest frame bleed through), that
  every sequence declares `mountFrames` equal to its played frames plus
  the rest frame, and that no `animation-fill-mode` is emitted. CI runs it
  on every pull request and every push to `main`.
  - The `mountFrames` assertion was added 2026-07-29, after the manifest
    shipped in 2.5.0 telling consumers which frames a sequence PLAYS but
    not which it must MOUNT. `running-loop` and `waiting-loop` rest on
    `rest` without ever naming it, so a consumer following the README
    rendered nothing at all under `prefers-reduced-motion`. Verified to
    bite: stripping `rest` from `running-loop` reports `mountFrames is
    [step-a,step-b], must be [step-a,step-b,rest]`.
- **Review:** changes under `scripts/` that touch sprite maps or the
  engine are checked for off-palette colors, non-integer scale, freehand
  paths, and re-declared maps. The CI determinism gate is the mechanical
  backstop: regenerating must not change committed `assets/mascot/` or
  `resources/social/`, and it runs on every pull request and every push to
  `main`.

## Scope

`scripts/lib/sprite.mjs`, `scripts/gen-sprites.mjs`, `scripts/gen-og.mjs`,
and any future sprite generator.

Does NOT govern the activity icon set (`scripts/lib/activity.mjs`,
`assets/activity/**`) or the ui glyph set (`scripts/lib/ui-glyphs.mjs`,
`assets/ui/**`). Those are stroked UI affordance and navigation glyphs, not
illustration, so the "never freehand `<path>`" and "rect grids only" rules do
not apply to them - they have their own rules in `activity-icon-geometry.md`
and `ui-glyph-geometry.md`.
Pixel art remains the only sanctioned ILLUSTRATION style; a status icon is not
illustration, and neither is a tab icon. The full mascot rationale and decision
history live in the `sprite-drafting` skill; the mascot's role in the
visual system lives in `design-language`.
