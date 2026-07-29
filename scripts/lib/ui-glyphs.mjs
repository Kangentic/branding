// lib/ui-glyphs.mjs - THE ui glyph geometry: the NAVIGATION and surface marks
// the desktop app, the mobile app, and the website all render. Every generator
// imports from here; no other file may re-declare these constants (the
// mark.mjs / sprite.mjs / activity.mjs precedent).
//
// This is the repo's FOURTH visual vocabulary. lib/mark.mjs is knockout-disc
// brand geometry; lib/sprite.mjs is pixel-art rect grids (illustration, per
// design-language); lib/activity.mjs is agent STATUS marks, which carry state
// pairs and a motion contract. These are stroked navigation glyphs: no state,
// no motion, no brand color of their own. They inherit currentColor from the
// surface that renders them. The pixel-art "never freehand <path>" rule governs
// sprites, not this file.
//
// It shares the activity set's grid rather than restating it: same 24 viewBox,
// same 18-unit layout slot (every outline spans x 3 to 21), same stroke 2, so a
// board tab icon and an agent status mark sit on one baseline in the same row.
// Those constants are DECLARED in lib/activity.mjs and IMPORTED here, because
// declaring them twice is the drift this repo's single-source rules exist to
// prevent.
//
// The slot fixes WIDTH, not height: within it each form is sized optically
// rather than stretched to a shared rectangle (see activity-icon-geometry).
// The kanban frame happens to be square, so here the slot and the box coincide.
//
// ---------------------------------------------------------------------------
// PROVENANCE
//
// The kanban glyph's proportions follow lucide's `SquareKanban` (ISC licensed),
// which is the shape kangentic-mobile reviewed and chose for its Board tab at
// stroke 2.0, against a 2.5 variant and a filled-lane variant. See
// THIRD-PARTY-NOTICES.md for the full ISC notice.
//
// The geometry is DECLARED here as named constants rather than vendored as path
// data, following the precedent this repo already set with lucide Mail's flap
// ratios (exploration/activity/compare.html): the angle is lucide's and the ink
// box is ours. That distinction is load-bearing rather than ceremonial. The
// activity set exists precisely BECAUSE stock library glyphs disagreed about
// their ink boxes, and copying a path in would reintroduce the coupling those
// marks were redrawn to remove. Here the redraw is exact, not approximate:
// SquareKanban's frame is already 3,3,18,18, which IS this repo's ink box.
//
// The consuming apps still depend on an icon library for their several hundred
// OTHER icons, and that is untouched. This set is additive.
// ---------------------------------------------------------------------------

import { VIEW, INK_BOX, INK_MIN, STROKE, LEGIBILITY_FLOOR_PX } from "./activity.mjs";

// Every derived number is rounded here so float error never reaches the path
// data (determinism + clean diffs), per lib/mark.mjs and lib/activity.mjs.
const n = (v) => +v.toFixed(4);

// ---------------------------------------------------------------------------
// The kanban glyph. A board frame with three lanes of unequal fill.
// ---------------------------------------------------------------------------

// The frame's corner radius. 2, not the activity chip's 3: this reads as a board
// edge rather than a screen bezel, and 2 is the value reviewed and chosen for
// the mobile tab bar. Iterating it means changing this constant, never a call
// site. A 3 alternate renders on the contact sheet for comparison.
export const FRAME_R = 2;

// The lanes. Three columns of DIFFERENT length is the whole idea: equal bars
// read as a list or a split view (which is exactly how the SF Symbols
// `rectangle.split.3x1` candidates failed), while unequal ones read as columns
// holding different amounts of work.
//
// x at 8/12/16 is symmetric about the grid centre (12) and leaves equal 5-unit
// margins to each ink-box wall. All three share a top edge so the row reads as
// one board rather than three floating bars.
export const LANE_TOP = 7;
export const LANE_X = [8, 12, 16];
export const LANE_END = [14, 11, 16];

// ---------------------------------------------------------------------------
// Element builders. No pathLength anywhere in this set: that attribute exists to
// normalize a dash for motion, and nothing here moves.
// ---------------------------------------------------------------------------

const rect = (x, y, w, h, r) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}"/>`;

const path = (d) => `<path d="${d}"/>`;

const inkBox = (r) => rect(INK_MIN, INK_MIN, INK_BOX, INK_BOX, r);

// A vertical lane from the shared top edge down to its own end.
const lane = (x, top, end) => path(`M${n(x)} ${n(top)}V${n(end)}`);

// Parameterized on the radius ONLY so the review sheet can draw the alternate
// beside the shipped one. The shipped glyph always uses FRAME_R; nothing else
// may pass a radius, or the byte-equality check has no stable value to compare.
export const kanbanBodyWithFrameR = (r) =>
  inkBox(r) + LANE_X.map((x, i) => lane(x, LANE_TOP, LANE_END[i])).join("");

const kanbanBody = () => kanbanBodyWithFrameR(FRAME_R);

// Radii drawn side by side on the contact sheet. The maintainer settles this
// from pixels; until then the shipped value is FRAME_R above.
export const FRAME_R_ALTERNATES = [
  { r: 2, note: "SHIPPED - lucide's radius" },
  { r: 3, note: "the activity chip radius" },
];

// ---------------------------------------------------------------------------
// The set. One glyph today; the family exists so the next navigation mark has a
// declared home instead of being drawn into a consumer.
// ---------------------------------------------------------------------------

export const GLYPHS = [
  {
    id: "kanban",
    role: "the board surface (mobile Board tab, desktop and web board nav)",
    body: kanbanBody(),
    minPx: LEGIBILITY_FLOOR_PX,
  },
];

export const glyphById = (id) => {
  const g = GLYPHS.find((x) => x.id === id);
  if (!g) throw new Error(`ui-glyphs: no glyph "${id}"`);
  return g;
};

// ---------------------------------------------------------------------------
// Rasters. iOS is the ONLY consumer that cannot take the SVG: UITabBarItem needs
// a real UIImage. Web and desktop render assets/ui/*.svg directly and get no
// PNG, deliberately.
//
// 25pt is the iOS tab-bar metric, at 1x/2x/3x. These sizes and the stroke were
// chosen for that surface specifically; a different optical weight elsewhere is
// a VARIANT, not a replacement, and changing these invalidates the store
// screenshots captured against them.
// ---------------------------------------------------------------------------

export const TAB_PT = 25;
export const TAB_SCALES = [1, 2, 3];
export const TAB_SIZES = TAB_SCALES.map((s) => TAB_PT * s);

/** A shipped glyph's vector filename. One glyph, one file, named as its id. */
export const fileFor = (glyph) => `${glyph.id}.svg`;

/** A shipped tab raster's filename. */
export const rasterFileFor = (glyph, size) => `${glyph.id}-tab-${size}.png`;

// ---------------------------------------------------------------------------
// The document builders. Two, and the split matters.
// ---------------------------------------------------------------------------

/**
 * The SHIPPED master: currentColor, so every surface tints it with its own
 * foreground token. This is what assets/ui/*.svg contains and what web and
 * desktop consume.
 */
export function glyphSvg(glyph, { size = VIEW } = {}) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${size}" height="${size}"`,
    ` fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"`,
    ` data-glyph="${glyph.id}" aria-hidden="true">`,
    glyph.body,
    `</svg>`,
  ].join("");
}

/**
 * The RASTER source: identical geometry with an explicit stroke color.
 *
 * Never rasterize the currentColor master. librsvg (the renderer behind sharp)
 * has no cascade to resolve currentColor against, so the result is unspecified
 * and has drifted between versions. gen-activity.mjs already rebuilds every mark
 * with a hex before it reaches sharp, for the same reason.
 */
export function glyphRasterSvg(glyph, { size = VIEW, color = "#ffffff" } = {}) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${size}" height="${size}"`,
    ` fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">`,
    glyph.body,
    `</svg>`,
  ].join("");
}

/**
 * The shipped manifest. Framework-agnostic data, so a consumer can resolve the
 * set without parsing SVG. It names the mobile rasters too, because those live
 * under resources/ and are otherwise undiscoverable from assets/ui/.
 */
export function manifest() {
  const glyphs = {};
  for (const g of GLYPHS) {
    glyphs[g.id] = {
      file: fileFor(g),
      role: g.role,
      minPx: g.minPx,
      rasters: TAB_SIZES.map((size, i) => ({
        file: `mobile/${rasterFileFor(g, size)}`,
        size,
        scale: `${TAB_SCALES[i]}x`,
        rendering: "template",
      })),
    };
  }
  return {
    $comment: "generated by scripts/gen-ui.mjs - do not hand-edit",
    grid: { viewBox: `0 0 ${VIEW} ${VIEW}`, inkBox: INK_BOX, strokeWidth: STROKE },
    color: "currentColor - the consuming surface supplies the tone",
    rasterNote:
      "iOS tab rasters are TEMPLATE images: color is discarded and the alpha channel is the whole payload. Do not composite them onto a background before handing them to UITabBarItem.",
    glyphs,
  };
}
