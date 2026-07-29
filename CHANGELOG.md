# @kangentic/branding Changelog

<!-- releases -->

## [v2.5.0] - 2026-07-29

### Features
- Own the agent, terminal and control status marks (aae8b99). New
  `assets/activity/`: nine marks across four silhouettes on one 24 grid
  with an 18x18 ink box, stroke 2, `currentColor` only, plus
  `activity.css` (drop-in keyframes) and `activity.json` (the same
  contract as framework-agnostic data). These were stock library defaults
  on every surface, and their ink boxes disagreed: measured live, the
  loader and the terminal chip filled 18x18 but the mail filled 20x16,
  about 11% wider and 11% shorter. Bounding boxes matched and areas were
  within 1%, but the aspect ratios did not, so scaling could not
  reconcile them and only redrawing could. Because all three consumers
  inherited the same defaults, fixing one surface alone would have broken
  cross-surface parity rather than restored it. States ship as NAMED
  marks (`agent-idle`, `agent-working`, `terminal-idle`,
  `terminal-working`, `terminal-new`, and idle/working pairs for the
  pause and stop controls) rather than a base glyph a consumer composes
  with a tone and an animation class, because that assembly step is where
  three renderings drift apart; rest is the `-idle` geometry in a muted
  tone, so there is no `-rest` file to fall out of sync with its twin.
  The set also absorbs a live instance of that drift: the pause and stop
  controls carried a hand-computed `47 16` dash duplicated verbatim
  across two desktop files, which breaks silently if the ring radius
  changes. Motion is one primitive, a dash marching via
  `stroke-dashoffset` normalized by `pathLength="100"`, and every dash
  ships in user units alongside the ratio because browsers honour
  `pathLength` while librsvg and react-native-svg do not, where a `75`
  dash covers a 56-unit circle entirely and the motion disappears. Nine
  directions were drawn and eight retired, each keeping its `draft` flag
  and a dated reason in `scripts/lib/activity.mjs`.

### Other
- Set per-column model and effort overrides (41a5c95).

## [v2.4.0] - 2026-07-27

### Features
- Add the missing store and OS-owned mobile assets. Six new files under
  `resources/mobile/`: the Play Store feature graphic
  (`android-feature-graphic-1024x500.png`, REQUIRED by Google Play on every
  track beyond internal testing and the one output in the package with no
  alpha channel), the Android notification icon (`notification-icon.png`,
  white on transparent - Android discards RGB on the small icon and keeps
  only alpha, so the full-color asset consumers pointed at rendered as a
  silhouette that lost the amber card), the iOS 18+ dark and tinted home
  screen variants (`ios-appstore-1024-dark.png`, `-tinted.png`, both
  background-free because the system composites its own material, tinted
  grayscale because iOS maps luminance onto the user's tint), the Android
  13+ themed icon (`android-adaptive-monochrome.png`), and a dedicated
  `splash-1024.png` that ends the mobile splash silently following a
  desktop asset. Every variant keeps the CANONICAL F4k geometry and varies
  color only, so the three iOS icons stay pixel-consistent as the user
  toggles appearance; the notification icon is the sole exception, taking
  the mono-tuned geometry because it displays at 24dp. Two new libs keep
  this single-source: `lib/pixelfont.mjs` (the 5x7 plate font, extracted
  from `gen-og.mjs`) and `lib/feature-graphic.mjs` (the 1024x500
  composition). `lib/mark.mjs` gains COLOR parameters only, no new
  geometry, so every existing asset stays byte-identical (7c30579)

### Other
- Add context7 MCP server (05c7b19)

## [v2.3.0] - 2026-07-25

### Features
- Ship the Overseer animation contract and a waiting-state pose vocabulary.
  The package now owns the mascot's MOTION, not just its pixels: sequences
  and timings are declared once and generated into
  `assets/mascot/animations.json` (framework-agnostic data, usable in React
  Native where there is no CSS) and `assets/mascot/animations.css` (a
  drop-in stepped frame swap for any browser or Electron surface). The
  format splits `clip` (the frame timeline) from `idle` (the scheduling
  policy), so a consumer keeps a randomised right-skewed cadence instead of
  being flattened to a bare interval. Eight sequences: `none`,
  `blink-loop`, `wave-once`, `double-arm-wave-once`,
  `double-arm-alternating-wave-once`, `looking-left-and-right-loop`,
  `running-loop`, `waiting-loop`. Seven new frames back them (10 total),
  including two compound running-plus-gaze frames. Purely additive: no
  existing frame changed and no `exports` map was introduced, which would
  have broken every consumer's `assets/*.svg?raw` deep imports. A new
  `ANIMATION` invariant enforces the motion budget mechanically for the
  first time (e65750f)

### Other
- Add a GitHub-viewable motion reference: `exploration/mascot/MOTION.md`
  renders every sequence as a looping GIF inline on GitHub, generated from
  the same declaration as the shipped files so it cannot drift (91a03a7)

## [v2.2.0] - 2026-07-13

### Features
- Add Overseer blink and wave pose frames for consumer-side animation:
  `assets/mascot/overseer-blink.svg` (all three eyes closed) and
  `assets/mascot/overseer-wave.svg` (viewer-right arm lifted one row, a
  2-pose toggle with rest). Frames share the canonical 18x12 grid and
  overlay pixel-perfectly; an `assertPose` guard keeps non-animated rows
  byte-identical to the canonical map. Sequencing is consumer-side and
  stepped, with `prefers-reduced-motion` resting on the canonical frame;
  the generated `exploration/mascot/animation-preview.html` is the
  reference recipe (425f883)

### Other
- Fix pose-frame names in the sprite-drafting mascot asset list (cc7b8f6)

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
