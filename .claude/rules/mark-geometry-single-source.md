# Rule: mark geometry lives only in scripts/lib/mark.mjs

The Kangentic mark's geometry (the frozen K path, the split-tip cuts, the
tight card, the F4k glyph, the disc builders, the tier selection) was
converged through many rounds. Re-declaring any of it elsewhere is how the
constants silently drift and a generator ships a subtly wrong mark - which
already happened once (card-K rasters shipped into `resources/` because a
by-raster-size picker treated 1024px as "large display").

## The rule

- All mark geometry is DECLARED once, in `scripts/lib/mark.mjs`. Every
  generator imports from it and declares no geometry of its own.
- The K is FROZEN path data (`K_PATH`, extracted once from Microsoft Tai
  Le Bold via WPF). Never render brandmark text with SVG `<text>`; never
  hand-edit the path. To change the typeface, re-run the extraction and
  update `K_PATH` / `K_B` / `K_BASELINE_IN_EM` in the lib.
- **The app icon is the F4k board glyph at EVERY raster resolution.** Tier
  by displayed context, never by pixel dimensions: a 1024px icon still
  shows at taskbar/dock size. Icon generators call `f4kParts()`; the
  card-K (`cardKParts()`) is only for genuinely large in-page display.
  Do not reintroduce a by-raster-size tier picker.
- Iterate in named constants (`CARD_MARGIN`, `CARD_RING`, `CUT_*`), never
  ad-hoc magic numbers at a call site.

## Enforcement (self-maintaining)

- **Review:** changes under `scripts/` are checked for re-declared
  geometry constants and for any icon path that renders card-K instead of
  F4k. The `/release` determinism gate is the mechanical backstop:
  regenerating must not change committed `assets/` or `resources/`.

## Scope

`scripts/**`. The decision history that must not be re-litigated lives in
the `icon-drafting` skill.
