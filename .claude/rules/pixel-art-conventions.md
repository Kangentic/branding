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
- The palette and the canonical `OVERSEER` map are declared ONCE in
  `scripts/lib/sprite.mjs`. Generators import them; they do not re-declare.
- The Overseer is the one character, at most once per page, always with
  plain alt text. Poses are variations of one map, not new creatures.
- Sanctioned exception (maintainer decision, 2026-07-13): the first-visit
  fly-in overture may show the UFO prop and the 11 minions alongside the
  Overseer. They exist only inside that sequence, never as standalone
  decoration; the minion run is a 2-pose toggle of ONE minion map, and
  the two UFO frames share one saucer grid.

## Enforcement (self-maintaining)

- **Review:** changes under `scripts/` that touch sprite maps or the
  engine are checked for off-palette colors, non-integer scale, freehand
  paths, and re-declared maps. The `/release` determinism gate is the
  mechanical backstop: regenerating must not change committed
  `assets/mascot/` or `resources/social/`.

## Scope

`scripts/lib/sprite.mjs`, `scripts/gen-sprites.mjs`, `scripts/gen-og.mjs`,
and any future sprite generator. The full mascot rationale and decision
history live in the `sprite-drafting` skill; the mascot's role in the
visual system lives in `design-language`.
