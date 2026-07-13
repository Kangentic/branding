# @kangentic/branding Changelog

<!-- releases -->

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
