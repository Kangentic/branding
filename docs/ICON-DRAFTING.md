# Icon Drafting

> Canonical copy. This repo (kangentic-branding) is the harness's home;
> the `icon-drafting` skill in kangentic.com mirrors this document for
> in-editor use. Paths below that reference kangentic.com `scripts/` or
> the app repo's `resources/rebrand/` describe the pre-migration layout;
> in this repo the harness is `scripts/gen-brandmark.mjs` and output goes
> to `exploration/` + `assets/`.

How Kangentic's brandmark was drafted, and how to pivot it later without
re-learning everything. The whole exploration was done in-repo with scripted
SVG -> sharp renders - no design tools - reviewed by Tyler from generated
contact sheets.

## The chosen mark (July 2026)

**F1bk "Card-K knockout"** is the primary brandmark:

- Rust disc (`#C0562F`).
- A rounded-square CARD punched clean through the disc (a true alpha hole,
  like the original blue-K logo) so the theme background flows through -
  cream on light pages, dark on dark themes.
- A rust **K** floating in the card window: Microsoft Tai Le Bold, frozen as
  path data (see below). The K's upper arm is severed near its end - the
  detached endpoint is filled **amber** (`#E8A33D`) with a thin gap cut
  across the arm. The tip reads as both a status lamp and a card in flight,
  and because it is literally the arm's own end, it stays typographically
  symmetric with the letter (Tyler's paint.net construction, implemented
  as paint-erase-overpaint).

**F4k board glyph** (three column holes + amber card, letterless) is the
**small-display mark** (<48px: nav, docs header, favicons) - see the
two-tier section. **F5k card pinwheel** (rotation form) stays secondary
for spinners/motion use.

The Overseer mascot (amber pixel blob, three sparkle eyes - see the
`design-language` skill) is a SEPARATE asset: site personality, not the
icon. Mascot != brandmark is deliberate (Claude Code's Clawd-vs-starburst
split): the mark must be recognizable and abstract; the creature is warmth.

## The harness (canonical scripts)

All in `scripts/` of kangentic.com; all output goes to the app repo at
`C:/Users/tyler/Documents/GitHub/kangentic/resources/rebrand/`:

| Script | Purpose |
|--------|---------|
| `gen-brandmark.mjs` | THE brandmark harness: disc/card/K builders, the split-K system, knockout masks, contact sheets, portable SVG exports. `node scripts/gen-brandmark.mjs` regenerates everything. |
| `gen-concepts.mjs` | Mascot/creature concept rounds (historical + future creature pivots). |
| `gen-sprites.mjs` | Pixel-art sprite pipeline (mascot canon `overseerAmber`). |
| `gen-app-icons.mjs` | Multi-size app icon sets (PNG ladder, hand-rolled ICO/ICNS containers, favicons) - currently builds from the mascot; the F1bk build-out repoints it at the brandmark. |
| `gen-brand.mjs` | OG image + legacy logo candidates. |

Key mechanics in `gen-brandmark.mjs`:

- **The frozen K**: `K_PATH` is the Microsoft Tai Le Bold "K" outline,
  extracted ONCE via WPF (`FormattedText.BuildGeometry` ->
  `GetFlattenedPathGeometry`) in PowerShell, at em=100 with baseline
  92.723. Never render brandmark text with `<text>` - path data keeps
  renders deterministic and SVGs portable. To change the typeface, re-run
  the extraction (see git history of this skill's creation) and update
  `K_PATH`/`K_B`/`K_BASELINE_IN_EM`.
- **The split-K (severed tip)**: paint-erase-overpaint. (1) full K,
  (2) `bandRect()` erases a gap band rotated to `ARM_A` across the upper
  arm (via own-mask `kWithGap()` where the background is unknown, or
  painted bg/white-in-mask in knockouts), (3) `tipClipped()` overpaints
  everything past `CUT2` in amber. Tip length and gap are the constants
  `BAND_C` and `GAP` - the cut can sit anywhere on the arm with no
  clipping side effects.
- **Knockouts**: `knockout(size, holes, filled)` builds a rust disc with
  alpha holes via an SVG mask (holes painted black inside the mask, disc
  restored white), then filled overlays on top. This is the
  theme-following rendition; the filled rendition is for fixed-appearance
  contexts (stores). Ship both.
- **`enlarged(svg)`**: +18% about center - the standard "use more of the
  disc" adjustment (legacy rounds; the shipped mark uses `tightCardK`).
- **The tight card** (`tightCardK(margin, cut)`): the card window is
  DERIVED from the glyph - `K_GLYPH_BOX` (the fontK output bbox) plus an
  even `CARD_MARGIN` (locked at 5) on all four sides, slightly portrait,
  then the whole unit auto-scales so the card corners sit `CARD_RING` (6)
  units inside the disc. This replaced the original fixed 56-unit square
  card, whose 7-13 units of uneven cream margin wasted pixels at icon
  sizes (Tyler, 2026-07-12). Never size the card independently of the
  glyph again; change `CARD_MARGIN` instead.

## Review discipline (what made this work)

1. Every candidate renders on a contact sheet at 192px AND 48/32/26/24/16
   strips, on cream/white AND warm-black/black. Judge marks at 16-32px
   FIRST - that is where icons live. **The K must be unmistakable at
   24x24** (Tyler's floor). Sheets: `_sheet-finalists.png`,
   `_sheet-knockout.png`, `_sheet-candidates.png`,
   `_card-tight-compare.png` in `resources/rebrand/icon-concepts/`. For
   pixel-level judging, render at target size and nearest-upscale x8
   (`_zoom24.png` pattern).
2. Iterate in numbers, not adjectives: tip length, gap width, scale factor,
   corner radius are all named constants.
3. Contrast math is non-negotiable: amber on cream is 2.05:1 (never text,
   soft as a graphic); amber on warm black 8.1:1; rust holds both modes
   (4.3:1 / 3.8:1) which is why the disc is rust.
4. Symmetry rules from Tyler: nothing pokes past the glyph's box; arm
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
  glyph IS the small-tier front door (nav/docs/favicon) - at 24-26px
  letterless-and-chunky beats every K form. F5k pinwheel remains
  secondary (spinners/motion).
- K-hole disc and cream-K disc at nav size: legible and viable, but lost
  the live header review to F4k - the board glyph reads as a product
  mark where the tiny K reads as generic monogram.
- My hand-built polygon Ks (v3/v4): joint nubs, weave artifacts, clipped
  terminals -> replaced by the real font glyph. Lesson: use a real
  typeface for letterforms; construct only what type can't give you.
- Card-K at nav size, any tuning: bigger tip cut, tight card - all
  failed; the rust-K-in-rust-ring merge is structural (see the two-tier
  section). Ink K in the card (R3) also rejected: the dark theme flows
  through the card window and swallows the ink K.

## The two-tier mark (the small-display rule)

Below ~48px the card-K fails STRUCTURALLY, not by degree: the K is the
same rust as the disc ring, so the eye merges them and reads the cream
window as the figure ("an O with a slot") - three figure-ground flips
(ring -> window -> K -> tip) is too many for 26px. No cut or margin
tuning fixes it (`_card-tight-compare.png` documents the attempts). So
the mark is a two-tier system, both from the same harness:

- **>=48px: card-K knockout** (`f1b-knockout.svg` -> site
  `public/brandmark.svg`). Canon `CUT_CANON` tip, tight card.
- **<48px: F4k BOARD GLYPH** (`f4-knockout.svg` -> site
  `public/brandmark-small.svg`; navs, docs header, favicons). Letterless:
  three column holes punched through the rust disc, amber card mid-drop.
  Tyler picked it as "the clear, outright winner" from an in-header
  live comparison (2026-07-12) against K-hole disc, cream-K filled,
  small-cut card-K, and the pinwheel - at 24-26px the chunky columns and
  amber card beat every letterform. Same knockout DNA as the card-K
  (holes in the rust disc, theme flows through), so the tiers read as
  siblings.

Alternates kept as exports (viable, lost the header review):
`kdisc-knockout.svg` (K is the hole, `CUT_SMALL` tip, glyph scaled via
`kOnDisc`) and `kdisc-filled.svg` (cream K painted - fixed-appearance
rendition for small rasters on unknown grounds; if a filled small mark
is ever needed, prefer a filled F4k built the same way).

Tip cuts (card-K family): `CUT_SMALL` exaggerates the sever + gap;
`CUT_CANON` is the refined large-display cut. Cuts are in glyph space,
so they scale with the K automatically.

When adding any new surface, pick the tier by rendered size, and verify
in context: `_small-rescue.png` (x8 zoom of the 24px raster) for pixel
truth, and an in-situ header render for the final call - contact sheets
alone did NOT predict the F4k win; the live nav did. The mark must be
unmistakable at 24x24.

## Where the mark lives on the site

The landing/pricing/BaseLayout navs (26px beside the Bricolage wordmark)
and the Starlight header via `logo` in `astro.config.mjs` - all use
`/brandmark-small.svg` = the F4k board glyph. `public/brandmark.svg` =
card-K canon, for large display. Favicons, manifest icons, JSON-LD
`logo.png`, and the app's `resources/` sets are replaced in the
production build-out (regenerate via the harness; card-K for >=48px
rasters, F4k for <48px, filled + knockout renditions of each).
