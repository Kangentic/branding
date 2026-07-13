---
name: icon-drafting
description: The Kangentic brandmark/icon drafting harness - how to draft, refine, and export logo/icon candidates with the canonical scripts, the review discipline (size strips on light and dark, in-situ header renders), the frozen K glyph, the two-tier mark system, and the decision history of rejected directions. Read before any logo, favicon, app-icon, or brandmark work.
---

# Icon Drafting

How Kangentic's brandmark was drafted, and how to pivot it later without
re-learning everything. The whole exploration was done with scripted
SVG -> sharp renders - no design tools - reviewed from generated contact
sheets and live in-header renders. THIS REPO is the canonical home:
geometry lives in `scripts/lib/mark.mjs`, and no other file (in any repo)
may re-declare it.

## The chosen mark (July 2026): a two-tier system

The tier is picked by **DISPLAYED context, never raster resolution**:
card-K where the mark shows large, F4k where the OS shows it small. The
dividing line is who controls the displayed size (settled 2026-07-12):

- **Multi-resolution containers (.ico/.icns) and the desktop PNG ladder**
  supply a size-specific entry, so the mark tiers per entry: card-K at
  128+ (dock, Finder/Explorer large views), F4k at 16-64 (taskbar, tray,
  tab). `exploration/icon-concepts/preview.png` shows this boundary.
- **Single-image masters the OS downscales itself** (iOS/Play store
  icons, PWA/apple-touch/manifest icons, favicons) stay F4k. A card-K
  master shrunk to a ~60px home-screen icon is illegible - this is the
  bug that produced the rule, first mis-seen as "F4k everywhere" and then
  corrected to the container-vs-master line above.

**Card-K "F1bk knockout"** (`assets/brandmark.svg`, large surfaces):

- Rust disc (`#C0562F`).
- A rounded card punched clean through the disc (a true alpha hole, like
  the v1 blue-K logo) so the theme background flows through. The card is
  DERIVED from the glyph bbox + `CARD_MARGIN` (5), slightly portrait,
  auto-scaled so its corners sit `CARD_RING` (6) inside the disc. Never
  size the card independently of the glyph.
- A rust **K** floating in the card window: Microsoft Tai Le Bold, frozen
  as path data. The K's upper arm is severed near its end - the detached
  endpoint is filled **amber** (`#E8A33D`). The tip reads as both a status
  lamp and a card in flight, and stays typographically symmetric because
  it is literally the arm's own end (a paint.net construction,
  implemented as paint-erase-overpaint).

**The small-display mark - F4k board glyph** (`assets/brandmark-small.svg`;
every chrome-size app-icon surface): letterless - three column holes
through the rust disc, amber card mid-drop. Picked as "the clear, outright
winner" from an in-header live comparison (2026-07-12) against K-hole
disc, cream-K filled, small-cut card-K, and the pinwheel: at 24-26px the
chunky columns and amber card beat every letterform. Same knockout DNA as
the card-K (holes in the rust disc), so the tiers read as siblings.

Why two tiers: at small display the card-K fails STRUCTURALLY, not by degree -
the K is the same rust as the disc ring, so the eye merges them and reads
the cream window as the figure ("an O with a slot"). No cut or margin
tuning fixes it (`exploration/icon-concepts/_card-tight-compare.png`
documents the attempts).

**The theme-tinted in-app pair** (consumer-themed chrome, selected
2026-07-13): two `currentColor` variants for surfaces where the CONSUMER
controls the background (app sidebar/title-bar lockups on light/dark/
accent themes). Both are built in `lib/mark.mjs` as a single
`fill-rule="evenodd"` path (no defs/masks/ids, viewBox only) so consumers
can inline them repeatedly, use them as CSS `mask-image`, and tint them
with the surface's foreground; `currentColor` does NOT tint through
`<img>`.

- `brandmark-mono-amber.svg` (`f4kDuoSvg()`): theme-tinted disc, amber
  card KEPT - the DEFAULT themed lockup. Picked from a mono-vs-duotone
  render: the amber card is the gesture that makes the glyph the mark;
  pure mono at nav size drifts toward a generic monogram. The card sits
  on amber-vs-foreground contrast (subtle warm chip on dark themes,
  vivid on light ink), and amber-inside-dark-panels is the role the
  design language sanctions.
- `brandmark-mono.svg` (`f4kMonoSvg()`): ONE currentColor fill, all
  shape as alpha - the three columns AND the card are holes. The colored
  mark paints the amber card ON the rust disc, so a single-color card
  would vanish; in mono it is knocked out as a fourth hole. For strict
  monochrome contexts: hard accent themes, CSS-mask usage, and the
  source for a future macOS tray template PNG.

Alternates kept viable as exports: `kdisc-knockout.svg` (K is the hole),
`kdisc-filled.svg` (cream K painted), F5k pinwheel (spinners/motion).
`assets/brandmark-filled.svg` is the fixed-appearance card-K for contexts
that reject alpha or sit on unknown grounds.

The Overseer mascot (amber pixel blob, three sparkle eyes - see the
`design-language` skill) is a SEPARATE asset: personality, not the icon.
Mascot != brandmark is deliberate (Claude Code's Clawd-vs-starburst split).

## The harness (canonical scripts)

| Script | Purpose |
|--------|---------|
| `scripts/lib/mark.mjs` | THE geometry: frozen K path, split-tip cuts, tight card, F4k glyph, knockout/square document builders, the `partsFor(size)` tier picker. Import from here; never re-declare. |
| `scripts/gen-brandmark.mjs` | Exploration harness: concept rounds, contact sheets, canonical SVG exports to `assets/`. `npm run gen`. |
| `scripts/gen-icons.mjs` | Production tree: every size/type for web, desktop (ICO/ICNS), and mobile into `resources/`. `npm run gen:icons`. |

Still in kangentic.com `scripts/` pending migration: `gen-sprites.mjs`
(mascot), `gen-app-icons.mjs` (mascot icon sets), `gen-brand.mjs` (OG
image). The kangentic.com copy of `gen-brandmark.mjs` is slated for
removal - do not evolve geometry there.

Key mechanics:

- **The frozen K**: `K_PATH` is the Microsoft Tai Le Bold "K" outline,
  extracted ONCE via WPF (`FormattedText.BuildGeometry` ->
  `GetFlattenedPathGeometry`) at em=100, baseline 92.723. Never render
  brandmark text with `<text>` - path data keeps renders deterministic and
  SVGs portable. To change the typeface, re-run the extraction and update
  `K_PATH`/`K_B`/`K_BASELINE_IN_EM` in `lib/mark.mjs`.
- **The split-K (severed tip)**: paint-erase-overpaint. (1) full K,
  (2) `bandRect()` erases a gap band rotated to `ARM_A` across the upper
  arm, (3) `tipClipped()` overpaints everything past the gap in amber.
  The cut can sit anywhere on the arm with no clipping side effects.
  Cuts are in glyph space so they scale with the K: `CUT_CANON` (refined,
  128px+) vs `CUT_SMALL` (exaggerated tip + gap, below 128) via
  `cutFor(size)`.
- **Knockouts**: `knockout(size, holes, filled)` builds a rust disc with
  alpha holes via an SVG mask, then filled overlays on top. This is the
  theme-following rendition. `discOnSquare()` is the opaque rendition for
  surfaces that reject alpha (iOS, stores): holes reveal the cream square.
- **The tier rule**: `markFor(size)` in `gen-icons.mjs` picks
  `cardKParts(size)` at 128+ and `f4kParts()` below, but ONLY for
  size-specific entries the OS selects from (the .ico/.icns containers and
  the desktop PNG ladder). Every `squarePng`/single-master surface the OS
  downscales itself (stores, PWA, favicons) is hard-wired to `f4kParts()`,
  regardless of raster size - a 1024 store master is still F4k because it
  becomes the small home-screen icon. Feeding `cardKParts()` into a
  downscaled master is the wrong-icon bug; do not.
- **The native-vs-renderer boundary**: the tier rule above governs
  OS-owned icon surfaces, which are raster by requirement (electron-builder
  takes .ico/.icns/.png; Electron `nativeImage`/`Tray` decode no SVG) and
  always colored. Surfaces the APP renders itself (sidebar/title-bar
  lockups, empty states) consume `assets/*.svg` instead:
  `brandmark-mono-amber.svg` for themed lockups, `brandmark-mono.svg` for
  strict monochrome, `brandmark-small.svg` where the fixed palette works.

## Review discipline (what made this work)

1. Every candidate renders on a contact sheet at 192px AND
   48/32/26/24/16 strips, on cream/white AND warm-black/black. Judge marks
   at 16-32px FIRST - that is where icons live. **The mark must be
   unmistakable at 24x24** (the legibility floor).
2. For pixel truth, render at target size and nearest-upscale x8
   (`_zoom24.png` pattern in `exploration/icon-concepts/`).
3. **Contact sheets alone did NOT predict the F4k win; the live nav
   did.** For the final call, render candidates in an exact replica of the
   consuming surface (site header light + docs dark + browser-tab mocks)
   and review in place.
4. Iterate in numbers, not adjectives: tip length, gap width, margin,
   ring, corner radius are all named constants in `lib/mark.mjs`.
5. Contrast math is non-negotiable: amber on cream is 2.05:1 (never text,
   soft as a graphic); amber on warm black 8.1:1; rust holds both modes
   (4.3:1 / 3.8:1) which is why the disc is rust.
6. Symmetry rules: nothing pokes past the glyph's box; arm
   terminals flush with cap/baseline; the tip must read as the arm's own
   severed end, not a foreign shape.

## Decision history (do not re-litigate without new information)

- Plain K-in-circle: too basic alone -> evolved into product-anatomy K.
- Pixel-glyph K in the disc: display concerns at icon sizes.
- Invader / pacman / plain block-with-eyes creatures: collide with
  OpenClaw, Pac-Man, Claude Code's icon.
- Rust-bodied creature: one shade from Claude Code's terracotta - the
  mascot went amber for agent-agnosticism.
- Ink marks: read "scary/dark"; ochre: dull; ink outline on the mascot:
  swallowed the silhouette; amber-as-K or amber-as-text on cream: fails
  contrast.
- Letterless-first branding (Slack argument): rejected for LARGE display
  on a young product. REVISED 2026-07-12 for small display: F4k board
  glyph IS the small-tier front door - at 24-26px letterless-and-chunky
  beats every K form. F5k pinwheel remains secondary (spinners/motion).
- K-hole disc and cream-K disc at nav size: legible and viable, but lost
  the live header review to F4k - the board glyph reads as a product mark
  where the tiny K reads as generic monogram.
- Card-K at nav size, any tuning: bigger tip cut, tight card - all failed;
  the rust-K-in-rust-ring merge is structural. Ink K in the card also
  rejected: the dark theme flows through the card window and swallows it.
- Hand-built polygon Ks (v3/v4): joint nubs, weave artifacts, clipped
  terminals -> replaced by the real font glyph. Lesson: use a real
  typeface for letterforms; construct only what type can't give you.
- The original fixed 56-unit card: 7-13 units of uneven cream margin -
  dead pixels at icon sizes -> replaced by the glyph-derived tight card.

## Where everything lives

- `assets/` - the canonical SVG marks (both tiers + filled + the
  mono/mono-amber in-app pair).
- `resources/` - the production tree per surface (web/desktop/mobile);
  see `resources/README.md` for the per-file table. Consumers copy from
  here or take the npm package; they never generate icons themselves.
- `archive/v1/` - the blue-K brand, frozen verbatim. Never regenerate,
  never edit. A future rebrand archives the v2 line the same way before
  the major bump (`/release` enforces this).
- `exploration/` - concept renders and every review contact sheet.
