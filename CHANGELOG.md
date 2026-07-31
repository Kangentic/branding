# @kangentic/branding Changelog

<!-- releases -->

## [Unreleased]

### Fixes
- Pixel-hint the needs-you envelope so the indicator band renders crisp.
  **`agent-idle` changes shape: the box goes from 18 x 14.4 to 18 x 16**, so its
  y edges move from 4.8 / 19.2 onto 4 / 20. Everything else is byte-identical.
  Adopting consumers should re-run their branding sync and update any pinned
  height; the flap angle (120.4 degrees), the 18 ink width and the keyline are
  unchanged.

  The reported defect was that the marks render softer than the icon-library
  glyphs beside them at 14, 15 and 16px. Measured, it localizes to one mark: at
  a `devicePixelRatio` of 1 the ring and the chip both score 1.92 on the edge
  softness scale, which is exactly what any library glyph on an 18 box scores,
  so they were already at parity. The envelope was the single outlier at 1.95
  against the 0.92 of the 20 x 16 Mail glyph it replaced. That glyph sat at
  y 4 / 20, already on the pixel lattice, and the uniform 0.9 scale that
  correctly restored its flap angle in 2.6.0 moved it off. 18 x 16 lands back on
  y 4 / 20, so it reproduces the replaced glyph's edges on this set's own
  18 keyline.

  **What it costs, recorded rather than argued away:** the aspect drops from
  1.25 to 1.125, and the 2026-07-29 finding that this reads squat beside the
  ring is not overturned, only outweighed. Enclosed area goes from +0.5% to
  +11.8% against the ring, and the task card swaps idle for working in place,
  so the swap was reviewed rendered before this was accepted. A sweep of every
  height from 12 to 18 established the trade is structural: sharpness at 1x and
  the reference mail aspect pull in opposite directions on an 18-wide box.

  Scope it honestly: the effect is largest at 100% display scaling and shrinks
  as `devicePixelRatio` rises. At 2x the withdrawn box scores identically to the
  promoted one in every cell.

  `ACTIVITY` now asserts every outline extremum is an integer, which catches a
  class byte-equality structurally cannot (a regenerated geometry change is
  byte-correct by construction). Verified to bite. The indicator keyline span is
  now a written-out literal like the control span already was; derived, it was
  not merely tautological but inverted, catching the one mark that does not
  derive from `INK_BOX` and missing all four that do.

### Records
- The review sheets now cover the whole 14/15/16 indicator band rather than one
  size, print the softness matrix across four display scalings, and carry the
  16-unit second master as a rendered comparison. Five drifted records fixed in
  the same pass: the task card was documented at 14px and renders at 16; the
  surface map named the wrong sizes; **15px appeared nowhere in this repo** while
  three desktop surfaces render indicators at it, which is why that band had
  never been reviewed; the mark table said "five marks", listed eight, and the
  set is nine; and the README described an 18x18 ink box the envelope has not
  filled since 2.6.0.

## [v2.7.0] - 2026-07-29

### Fixes
- Ship the frame mount set consumers need for reduced motion (bd9b884).
  `animations.json` now carries `mountFrames` per sequence: the played clip
  PLUS the frame the sequence rests on. It previously told a consumer which
  frames a sequence PLAYS but not which it must MOUNT, and `running-loop` and
  `waiting-loop` both rest on `rest` without ever naming it in their clip, so a
  consumer following the README mounted only the played poses and rendered
  NOTHING AT ALL under `prefers-reduced-motion`. That shipped in 2.5.0 and
  2.6.0. **Adopt `mountFrames` when mounting frame divs**; `clip` remains what
  to play. Additive and backward compatible, so upgrading breaks nothing, but
  a consumer that does not adopt it keeps the reduced-motion bug. The
  `ANIMATION` check now asserts the set, and CI runs `npm run check` on every
  push. Verified to bite: stripping `rest` from `running-loop` reports
  `mountFrames is [step-a,step-b], must be [step-a,step-b,rest]`. The mount
  contract was wrong in four places (README, the `animations.css` header,
  MOTION.md and `sprite-drafting`) and is corrected in all of them.
- Render the tints the review sheet promises, correct the keyline claims
  (0c96c51). Record-fidelity only: no shipped asset changes. sharp's `.tint()`
  maps chroma in LAB with luminance preserved, so it cannot move a white pixel,
  and three bands of the mobile review sheet were built on it while every
  artwork they tint is white or near-white by design. The notification mock drew
  white on a white card and was invisible; the two Android themed tiles came out
  byte-identical under captions promising two different wallpaper tints; the
  tinted band's candidate A rendered three identical cells. The alpha-only
  surfaces now reuse the existing `templateTinted`, the genuinely grayscale iOS
  master takes a luminance ramp, and `assertRecolored` throws if a recolor
  leaves an opaque pixel pure white. Separately,
  `activity-icon-geometry.md` asserted twice that every mark spans x 3 to 21,
  false for the four `control-*` marks since the per-role split, and quoted a
  gate message the checker can no longer emit; both now describe the two
  keylines the code declares, and `controlRing`'s docstring stops arguing a
  premise a dated note 100 lines below records as reverted.

### Other
- Remove the Brand Review column (ee4364c). Its code-review half became
  `.claude/rules/brand-record-fidelity.md`, enforced by `/code-review` on the
  PR; `npm run check` already gates in CI.

## [v2.6.0] - 2026-07-29

### Features
- Own the kanban board glyph as a shared asset (962e6c2). New
  `assets/ui/kanban.svg`, a FOURTH visual vocabulary distinct from the
  brandmark, the mascot and the activity status set. kangentic-mobile
  needed a Board tab icon; SF Symbols ships no kanban glyph, so mobile had
  rasterised lucide `SquareKanban` locally behind a private pipeline (a
  build script, a checked-in PNG set, a devDependency) that existed only
  because no package owned the glyph, while Android rendered Material
  `view_kanban`, close but not identical. `lib/ui-glyphs.mjs` imports the
  activity set's 24 grid, 18x18 ink box and stroke 2 rather than restating
  them, so a navigation icon and an agent status mark sit level in one
  row. Proportions follow lucide `SquareKanban` (ISC), declared as named
  constants rather than vendored path data. Web and desktop take the SVG
  directly; iOS gets `resources/mobile/kanban-tab-{25,50,75}.png` as
  template images (alpha-only white on transparency, verified before
  writing). A new mechanical check (`gen:ui` in the determinism gate,
  `npm run check` now wired into both CI workflows) closes a pre-existing
  gap where CI only checked for byte drift.

### Fixes
- Correct the envelope aspect and restore the control ring radius
  (2e47ca7). The 2.5.0 activity set held every mark to one 18x18 ink box;
  that premise broke two marks. The needs-you envelope squared from 20x16
  to 18x18, which read as a photo placeholder on a real task card and
  sharpened its flap angle 11.6 degrees past the reference glyph. It now
  uses an 18x14.4 box, a uniform 0.9 scale of the reference glyph, fixing
  the aspect and the flap angle together while keeping the 18-unit width
  that aligns the tabular counter column. The pause/stop controls were
  shrunk from their shipped `r=10` to `r=9` on the same premise, silently
  overriding a human judgement recorded in the desktop app's own source
  ("r=9 rendered ~10% smaller"); restored to `r=10`, which also makes the
  normalized dash resolve to `47.12/15.71`, matching the app's original
  hand-computed `47 16` almost exactly. The mechanical gate now asserts
  ink extent per ROLE (indicator vs. control) instead of one hardcoded
  span, so this class of regression cannot reoccur silently.

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
