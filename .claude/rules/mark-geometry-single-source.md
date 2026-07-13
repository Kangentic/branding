# Rule: mark geometry lives only in scripts/lib/mark.mjs

The Kangentic mark's geometry (the frozen K path, the split-tip cuts, the
tight card, the F4k glyph, the disc builders) was converged through many
rounds. Re-declaring any of it elsewhere is how the constants silently
drift and a generator ships a subtly wrong mark - which already happened
once (card-K shipped onto app-icon surfaces the OS downscales to chrome,
where it becomes an illegible mini-K).

## The rule

- All mark geometry is DECLARED once, in `scripts/lib/mark.mjs`. Every
  generator imports from it and declares no geometry of its own.
- The K is FROZEN path data (`K_PATH`, extracted once from Microsoft Tai
  Le Bold via WPF). Never render brandmark text with SVG `<text>`; never
  hand-edit the path. To change the typeface, re-run the extraction and
  update `K_PATH` / `K_B` / `K_BASELINE_IN_EM` in the lib.
- **Tier the mark by DISPLAYED context, not raster size.** card-K where
  the mark shows large, F4k where the OS shows it small. The dividing line
  is who controls the displayed size:
  - Multi-resolution containers (.ico/.icns) and the desktop PNG ladder
    supply a size-specific entry, so they tier: `markFor(size)` picks
    card-K at 128+ and F4k at 16-64.
  - Single-image masters the OS downscales itself (iOS/Play store icons,
    PWA/apple-touch/manifest icons, favicons, `squarePng` surfaces) stay
    F4k. A card-K master shrunk to a 60px home-screen icon is illegible -
    this is the bug that produced this rule. Never feed `cardKParts()`
    into a surface the OS resizes down to chrome.
  - The tiering above governs OS-OWNED surfaces (raster by native-layer
    requirement, always colored). Surfaces the consumer app renders
    itself consume `assets/*.svg`: `brandmark-mono.svg` (`f4kMonoSvg()`,
    one currentColor, all shape as alpha) where the theme must tint the
    mark, the colored SVGs where the fixed palette works.
- Iterate in named constants (`CARD_MARGIN`, `CARD_RING`, `CUT_*`), never
  ad-hoc magic numbers at a call site.

## Enforcement (self-maintaining)

- **Review:** changes under `scripts/` are checked for re-declared
  geometry constants and for any downscaled-master surface fed card-K.
  The `/release` determinism gate is the mechanical backstop:
  regenerating must not change committed `assets/` or `resources/`.

## Scope

`scripts/**`. The decision history that must not be re-litigated lives in
the `icon-drafting` skill.
