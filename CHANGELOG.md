# @kangentic/branding Changelog

<!-- releases -->

## [v2.1.0] - 2026-07-13

### Features
- Add theme-safe mono brandmark variant for in-app chrome:
  `assets/brandmark-mono.svg`, a single-currentColor F4k (all shape as
  alpha holes) that inlines and tints with the consumer's theme (6874040)
- Add mono-amber duotone variant as the default themed in-app lockup:
  `assets/brandmark-mono-amber.svg`, currentColor disc with the amber card
  kept (5a321d7)
- Tune mono-pair breakoff for small-size legibility (v4): wider
  column-to-card gap and a larger squared card so the gesture survives
  20-24px; colored marks unchanged (d751e33)
- Add /brand-review skill and mechanical invariant gate (`npm run check`),
  now covering the mono pair (currentColor-only, inline-safe) (3739332)

### Other
- Document the raster-vs-SVG boundary (native OS surfaces decode no SVG;
  in-app renderer marks consume `assets/*.svg`) and the vector home in the
  READMEs (part of 6874040)
- Simplify README and drop stale migration section (8a4166e)
- Add pull-request and merge-pull-request skills (5191b3a)
- Fix npm OIDC trusted publishing config (case-sensitive trusted publisher;
  registry-url restored) (b3a3f31, 8c76eae)

## [v2.0.1] - 2026-07-13

### Added
- CI publishing: a `v*` tag push now builds and publishes
  `@kangentic/branding` to npm from GitHub Actions with provenance, via npm
  OIDC Trusted Publishing (no stored token). Every release carries a
  provenance attestation linking the tarball to its source commit and run.

### Changed
- The social image (`resources/social/og-image.png`) proof-line caption is
  drawn in the 5x7 pixel font (uppercase plate register) instead of a system
  monospace, so all type on the image is crisp rects and the PNG is
  byte-identical on any OS.

### Removed
- `preview.png` (the icon tier-boundary contact sheet) is no longer shipped
  in the package; it moved to `exploration/icon-concepts/` as a review
  artifact.

### Fixed
- The determinism gate is now cross-platform reproducible: `.gitattributes`
  pins LF so a Windows checkout no longer trips the gate on phantom CRLF
  diffs, and the text-bearing composites regenerate byte-identically on
  Linux CI.

## [v2.0.0] - 2026-07-12

Initial release of the Warm Craft (v2) brand line: cream, ink, rust, amber.

### Added
- Two-tier app icon keyed to displayed context: the card-K (letter with a
  severed amber arm-tip) for large display, the F4k board glyph for small
  and OS-chrome sizes. Knockout (theme-through) and opaque renditions.
- Canonical brandmark vectors in `assets/` (brandmark, brandmark-small,
  brandmark-filled) and the full production icon tree in `resources/`
  (web, desktop `.ico`/`.icns`/ladder, mobile store + adaptive).
- The Overseer pixel-art mascot (`assets/mascot/overseer.svg`) and the
  social share image (`resources/social/og-image.png`).
- Deterministic generators (`gen`, `gen:icons`, `gen:sprites`, `gen:og`)
  built on the frozen Tai Le K glyph and the shared sprite engine.

### Archived
- The v1 blue-K brand (`archive/v1/`) and the full mascot/creature
  exploration with the superseded mascot-icon sets
  (`archive/mascot-explorations/`), so the progression is never lost.
