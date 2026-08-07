// lib/activity.mjs - THE activity icon geometry: the agent-status and
// Command Terminal glyphs the desktop app, the mobile app, and the website all
// render. Every generator imports from here; no other file may re-declare these
// constants (the mark.mjs / sprite.mjs precedent).
//
// This is the repo's THIRD visual vocabulary, and it is deliberately not either
// of the other two. lib/mark.mjs is knockout-disc brand geometry; lib/sprite.mjs
// is pixel-art rect grids (illustration, per design-language). These are stroked
// UI affordance glyphs: they carry no brand color of their own and inherit
// currentColor from the surface that renders them. The pixel-art "never freehand
// <path>" rule governs sprites, not this file.
//
// NO GLYPH IN THIS SET COMES FROM AN ICON LIBRARY. Every mark is declared here:
// its ink box, corner radius, stroke, flap, dash and motion. The consuming apps
// still depend on an icon library for their several hundred OTHER icons, and
// that is untouched - this set is additive and owns only the activity marks.
// The one library path in this file is ARC_D, used solely by BASELINE to draw
// what ships today for comparison.
//
// The set SHIPS. Direction d1 was picked from exploration/activity/compare.html
// and promoted, and nine marks live in assets/activity/ today. The `draft: true`
// entries below are the directions and envelope boxes that LOST, kept with their
// dated reasons rather than deleted, per .claude/rules/activity-icon-geometry.md,
// so a later change re-argues them from the record instead of from scratch.
// Promotion is deleting that flag; nothing still carrying it reaches assets/.
//
// Corrected 2026-07-29. This header used to say the set was UNDER REVIEW and
// that "nothing here ships to assets/ until then", which stayed behind after
// the promotion and read as false to anyone opening this file.

// ---------------------------------------------------------------------------
// The grid. One grid, one stroke weight, one ink box, for every mark in the set.
// ---------------------------------------------------------------------------

// Every derived number is rounded here so float error never reaches the path
// data (determinism + clean diffs), per lib/mark.mjs. Declared first because
// the geometry constants below are computed, not typed.
const n = (v) => +v.toFixed(4);

// The 24-unit grid every UI icon library uses, so the set sits beside whatever
// else a consumer renders without rescaling. The set itself imports nothing:
// every mark below is declared here.
export const VIEW = 24;
// The ink box every mark fills. The stock glyphs this set replaces were not on
// one: the loader and terminal were 18x18 but the mail was 20x16, ~11% wider
// and ~11% shorter. Aspect differs, so scaling cannot reconcile them - only
// redrawing can, which is what this file is.
export const INK_BOX = 18;
export const INK_MIN = (VIEW - INK_BOX) / 2; // 3
export const INK_MAX = VIEW - INK_MIN; // 21
export const STROKE = 2;

// Normalizes any closed outline's perimeter to 100 units, so a dash pattern is
// geometry-independent: the same marching treatment drops onto a circle, an
// envelope, or a rounded square with no per-shape retuning.
export const PATH_LENGTH = 100;

// Below this the 2px stroke on a 24 grid falls under one device pixel and the
// glyph smears. Consumers rendering smaller than this use a dot, not a mark.
export const LEGIBILITY_FLOOR_PX = 12;

// ---------------------------------------------------------------------------
// Pixel hinting. Where a stroke lands on the device pixel grid, measured.
//
// The desktop renders indicators across a 14-15-16 band (task card and sidebar
// project row at 16, monitor card/table/summary at 15, terminal sidebar at 14),
// and the marks read softer there than the icon-library glyphs beside them.
//
// Stroke 2 on a 24 grid renders STROKE * px / VIEW device pixels: 1.1667 at 14,
// 1.25 at 15, 1.3333 at 16. None is an integer, so at no size in the band can a
// coordinate put BOTH stroke edges on pixel boundaries. That is not a defect to
// be fixed; it is arithmetic, and it is true of every 24-grid icon set including
// the libraries this one sits beside. Authoring a second master on a 16 grid
// does not escape it either: stroke 2 there renders 2.0px at size 16, which is
// exact, and 50% heavier than the 1.3333px glyphs next to it.
//
// What a coordinate DOES control is how the ink is split across pixel rows, and
// that is worth a lot. At 16 (scale 2/3) a coordinate divisible by 3 lands
// exactly on a boundary and halves into two rows at 0.667 each - the softest
// possible result. One third off a boundary draws one SOLID row plus a 0.333
// halo. At 15 (scale 5/8) the coordinates 4, 12 and 20 land on pixel CENTRES,
// which is the crispest result available at that size.
//
// So the hint is a lattice, not a stroke width, and this function is how any
// claim about it gets made. Measure, never assert.
export const INDICATOR_SIZES = [14, 15, 16];

// DISPLAY SCALING IS PART OF THE QUESTION, and leaving it out was the first
// wrong turn this round took. Everything above reasons in DEVICE pixels, but a
// consumer sizes an icon in CSS pixels, and the two are equal only at a
// devicePixelRatio of 1. The desktop app ships on Windows, where 125% and 150%
// are common defaults, and on macOS, where every panel is 2x.
//
// It matters enormously. At dpr 1.5 a 16px render is scale 1.0 with a stroke of
// exactly 2.0 device px, so EVERY integer coordinate has both edges dead on a
// pixel boundary and is perfectly hard - while the shipped 4.8 is still soft.
// At dpr 1 the whole band is soft and the spread between candidates is widest.
// A sheet that silently assumed dpr 1 would have overstated the fix on three of
// the four scalings the consumers actually run at.
export const DPRS = [1, 1.25, 1.5, 2];

// Float slack. `4 * (16/24)` is 2.6666666666666665, so its lower stroke edge
// computes as 1.9999999999999998 rather than 2. Bucketed naively that opens a
// phantom row of 2e-16 coverage and reports a two-row split as three.
const PX_EPS = 1e-9;

/**
 * How grey a single stroke edge's boundary pixel is.
 *
 * An edge landing exactly on a pixel boundary produces no partial pixel at all,
 * which is what "hard" looks like. One landing dead centre produces the greyest
 * possible. 0 = hard, 1 = softest.
 */
const edgeGrey = (pos) => {
  const f = +(pos - Math.floor(pos)).toFixed(9);
  return n(2 * Math.min(f, 1 - f));
};

/**
 * How one axis-aligned stroke centreline lands on the device pixel grid.
 *
 * `px` is DEVICE pixels: multiply a CSS size by the devicePixelRatio before
 * calling, or use softnessMatrix below, which does it for you.
 *
 * `softness` is the headline number and the only one anything ranks by: the
 * mean greyness of the two stroke edges. 0 means both edges sit exactly on
 * pixel boundaries; higher is softer. `rows` and `core` come back too because
 * they are what a reader can picture, but they must NOT be used to rank.
 *
 * That is not a stylistic preference, it is a correction. This function first
 * shipped ranking by `core`, the largest single covered row, which SATURATES:
 * once the device stroke passes about 2px every candidate scores 1.0 and the
 * metric reports "no difference" on exactly the high-dpr displays where there
 * still is one. The replacement tried the fraction of ink in fully covered
 * rows, which is worse - a step function whose output swings from 0 to 0.8 on a
 * 0.083 change in coverage, so it ranks candidates by how often they land on an
 * exact integer rather than by how sharp they look. `softness` is continuous,
 * has no threshold, and means the same thing at every dpr.
 *
 * Axis-aligned only, and deliberately so. A diagonal (the envelope flap) and a
 * curve (the ring, away from its four extrema) anti-alias whatever their
 * coordinates are, so hinting them buys nothing and claiming otherwise would be
 * the kind of unmeasured rationale brand-record-fidelity.md exists to stop.
 */
export const strokeCoverage = (coord, px, { view = VIEW, stroke = STROKE } = {}) => {
  const scale = px / view;
  const centre = coord * scale;
  const half = (stroke * scale) / 2;
  const lo = +(centre - half).toFixed(9);
  const hi = +(centre + half).toFixed(9);
  const rows = [];
  for (let row = Math.floor(lo + PX_EPS); row < Math.ceil(hi - PX_EPS); row++) {
    const covered = Math.min(hi, row + 1) - Math.max(lo, row);
    if (covered > PX_EPS) rows.push(n(covered));
  }
  return {
    centre: n(centre),
    edges: [lo, hi],
    rows,
    core: n(Math.max(...rows)),
    softness: n((edgeGrey(lo) + edgeGrey(hi)) / 2),
  };
};

/** One coordinate's softness at a CSS size on a display of a given scaling. */
export const softnessAt = (coord, cssPx, dpr, opts) => strokeCoverage(coord, cssPx * dpr, opts).softness;

/**
 * A coordinate scored across every scaling and every size in the band, plus the
 * total. The total is the ranking number, and a candidate that wins it can
 * still lose individual cells - which is why the sheet prints the matrix rather
 * than the total alone.
 */
export const softnessMatrix = (coord, opts) => {
  const cells = DPRS.map((dpr) => ({
    dpr,
    sizes: INDICATOR_SIZES.map((cssPx) => ({ cssPx, softness: softnessAt(coord, cssPx, dpr, opts) })),
  }));
  return { coord, cells, total: n(cells.reduce((sum, r) => sum + r.sizes.reduce((s, c) => s + c.softness, 0), 0)) };
};

// Corner radii. The envelope is paper (crisper), the chip is a screen bezel.
export const R_ENVELOPE = 2;
export const R_CHIP = 3;

// The envelope flap, as fractions of the envelope's OWN box so the V scales with
// it. The flap is the envelope's whole identity at 14px and the only thing
// separating it from the terminal chip once both are 18 wide, so its depth is
// the one number worth iterating on rather than asserting.
//
// Depth drives the vertex angle, and the half-width is the BOX's, not a
// constant: angle = 2*atan((w/2)/depth). That distinction is load-bearing and
// was got wrong once. Ratios are preserved under a change of box; ANGLES ARE
// NOT, unless both dimensions scale together. See ENVELOPE_CANDIDATES below.
//
// Deeper reads more like mail and more like a downward arrow; shallower reads
// calmer and, past a point, like a lid rather than a flap.
export const FLAP_VARIANTS = [
  { id: "deep", top: 0.222, vertex: 0.611, note: "first draft, rejected as too pointy" },
  { id: "standard", top: 0.1875, vertex: 0.5456, note: "selected 2026-07-28" },
  { id: "mid", top: 0.1875, vertex: 0.5208, note: "" },
  { id: "soft", top: 0.167, vertex: 0.444, note: "" },
  { id: "shallow", top: 0.139, vertex: 0.375, note: "" },
  { id: "lid", top: 0.111, vertex: 0.306, note: "" },
];
// Selected from the contact sheet 2026-07-28 against a target depth of 6 to 6.5,
// arrived at by drafting six angles and looking at them.
//
// CORRECTED 2026-07-29. That round recorded "the angle is lucide's and the ink
// box is ours". It is not, and the formula above says why: the ratios were
// transplanted onto a box that was both narrower and taller, so the angle came
// out 11.6 degrees pointier than the glyph they were taken from. Measured off
// the live production DOM rather than recall:
//
//   reference mail   box 20 x 16, half-width 10, depth 5.727 -> 120.4 degrees
//   standard on 18   box 18 x 18, half-width  9, depth 6.446 -> 108.8 degrees
//
// 108.8 sits 4.6 degrees from `deep`, the draft that same round rejected as too
// pointy. The 6-to-6.5 depth target was set on an 18-TALL box and does not
// transfer: on a shorter box the same angle wants a shallower depth. Depth is
// the wrong thing to hold constant across boxes; the angle is the thing the eye
// reads. Both are printed per candidate on the review sheet now.
export const FLAP_DEFAULT = "standard";

// ---------------------------------------------------------------------------
// The envelope's own box. UNDER RE-REVIEW 2026-07-29.
//
// The rest of the set fills the 18x18 ink box. The envelope is the one mark
// where that is in question, because an envelope's ASPECT is its identity: the
// square box shipped in 2.5.0 and, on a real task card with no neighbouring
// mark to align to, stops reading as an envelope and reads as a photo or image
// placeholder.
//
// The 18-unit ink WIDTH is what aligns the tabular counter column (ring
// diameter 18, chip 18), and that is preserved by every candidate at w=18.
// Height never contributed to that alignment. So the two properties the last
// round treated as one are separable, and these candidates separate them.
//
// A candidate is a {box, flap} PAIR, not a box, because the two defects above
// are coupled: change the box and the angle moves with it. Promotion is
// flipping ENVELOPE_DEFAULT, the way FLAP_DEFAULT works. Rejected candidates
// stay declared with their reasons.
export const ENVELOPE_CANDIDATES = [
  {
    id: "square",
    w: 18,
    h: 18,
    flap: "standard",
    retired:
      "2026-07-29: shipped in 2.5.0 and withdrawn. On a task card with no neighbouring mark it reads as a photo or image placeholder rather than an envelope. Squaring the box did two things at once: it took the aspect to 1.00, and it sharpened the flap to 108.8 degrees, 4.6 off the `deep` draft already rejected as a downward arrow. It also left the envelope sharing the terminal chip's exact rect, separated only by one unit of corner radius",
    note: "the incumbent this re-review withdrew",
  },
  {
    id: "between",
    w: 18,
    h: 16,
    // Declares a target ANGLE rather than a flap variant. Holding the reference
    // ratios here would give 115.0 degrees, which is not the reference angle or
    // any other considered number - it is the same ratio-transplant artifact
    // that produced the 108.8 bug, just milder. Pinning the angle instead means
    // this differs from `mail` in box height ALONE.
    angle: "reference",
    // RE-OPENED 2026-07-31 on new information, which is the bar CLAUDE.md sets
    // for revisiting a settled direction. It lost the 2026-07-29 round on
    // aspect alone, and nothing about that judgement has changed. What is new
    // is that y 4 / y 20 is the SHARPEST box in the field: total edge softness
    // 5.312 across the twelve dpr-by-size cells, against 5.687 for mail-hinted,
    // 6.417 for the shipped box and 6.646 for the 18 slot's own y 3 / y 21.
    //
    // Stated honestly, because the matrix is not a clean sweep: it wins big at
    // dpr 1 (0.333 / 0.250 / 0.333 against the shipped box's 0.600 / 0.750 /
    // 0.600) and it LOSES to the shipped box in several dpr 1.25 and dpr 2
    // cells. A total is a summary, and the sheet prints every cell for that
    // reason.
    //
    // SELECTED 2026-07-31, from the in-place swap strip and the specimen bands
    // rather than from the totals. What decided it:
    //
    // 1. It is the only box that restores the sharpness of the glyph this set
    //    replaced. lucide Mail was 20 x 16, so y 4 / 20; this is 18 x 16, so
    //    y 4 / 20 as well. Identical edges, identical score (0.92 at dpr 1
    //    against the shipped box's 1.95), on this set's own 18 keyline.
    // 2. The report localizes to this one mark. Measured at dpr 1, the ring and
    //    the chip both score 1.92, which is exactly what ANY icon-library glyph
    //    on an 18 box scores - they are already at parity with their neighbours
    //    and nothing but moving the shared keyline could change that. The
    //    envelope was the single outlier.
    // 3. A sweep of every height from 12 to 18 in 0.2 steps established the
    //    trade is structural: sharpness at dpr 1 and the reference mail aspect
    //    pull in opposite directions on an 18-wide box, and no height gets
    //    both. Inside the +/-5% area band the best total is mail-15's 1.54.
    //
    // WHAT IT COSTS, recorded because it is real and was accepted rather than
    // argued away. Aspect drops to 1.125, and the 2026-07-29 round's judgement
    // that this reads squat beside the ring HAS NOT BEEN OVERTURNED - only
    // outweighed, by evidence that round did not have. And the box encloses
    // 284.6 units against the ring's 254.5 (+11.8%), where the withdrawn box
    // sat at +0.5%; the task card swaps idle for working IN PLACE, so this is
    // a visible-growth risk that was checked on the swap strip and accepted.
    selected: "2026-07-31",
    note: "aspect 1.125; the sharpest box in the field and the only one that restores the replaced glyph's y 4 / 20 edges. Costs the aspect and +11.8% area against the ring",
  },
  {
    id: "mail",
    w: 18,
    h: 14.4,
    flap: "standard",
    // SELECTED 2026-07-29 from the isolation sheet, on three counts. It is the
    // only candidate that fixes both defects with one change: a uniform 0.9
    // scale of the reference glyph, so aspect 1.25 and the 120.4 degree angle
    // come back together and no separate flap decision is needed. It keeps the
    // 18 ink width, so the tabular counter column the set exists for is
    // untouched. And it separates the envelope from the terminal chip by
    // SILHOUETTE rather than by one unit of corner radius, which is the
    // adjacency the 2026-07-28 round named as make-or-break and then priced as
    // "a small cost". It was not small.
    // WITHDRAWN 2026-07-31 in favour of `between`, and the reasoning that
    // selected it on 2026-07-29 is left standing above because none of it was
    // wrong. The uniform 0.9 scale IS the only transform that carries the flap
    // angle across, it DID fix both 2.5.0 defects with one change, and it DOES
    // hold the 18 ink width. It was selected on the evidence that round had.
    //
    // Added 2026-07-31, and it is the defect that opened this round: the 0.9
    // scale that fixes the aspect and the angle lands the box on 4.8 and 19.2.
    // Every other outline in the set is on integers, and 4.8 is off the lattice
    // at every scaling but one (4.8 x 1.25 = 6.0 is the single exception).
    //
    // Total edge softness 6.417 across the twelve dpr-by-size cells, third of
    // four. Where it hurts most is dpr 1, where it is beaten at all three sizes
    // (0.600 / 0.750 / 0.600 against 0.333 / 0.250 / 0.333), and dpr 1.5 at
    // 16px, where every integer candidate is PERFECTLY hard (0.000, because
    // that combination is scale 1.0 with a 2.0px stroke) and this box is 0.400.
    //
    // And where it does not: at dpr 1.25 and dpr 2 it is the sharpest candidate
    // in several cells. So this is not a mark that is soft everywhere, it is a
    // mark whose sharpness depends on the viewer's display in a way none of its
    // siblings' does. That is the honest version of the report, and it is
    // narrower than "the marks are soft".
    note: "aspect 1.25 at the set's 18 width; a uniform 0.9 scale of the reference glyph, so it restores the 120.4 degree angle for free. The one shipped outline that is off the pixel lattice",
  },
  {
    id: "mail-hinted",
    w: 18,
    h: 14,
    // The aspect-1.25 lineage's integer representative: `mail` rounded to the
    // nearest whole box, so y lands on 5 and 19. Total edge softness 5.687,
    // second of four - behind `between` overall, ahead of it at dpr 1.25 and
    // dpr 2, and the only candidate that is sharpest in the dpr 2 / 14px cell.
    //
    // So it is the compromise cell of this matrix, and it is the one that keeps
    // both properties the shipped box was chosen for: the mail aspect (1.286
    // against 1.25) and the in-place area parity with the ring (-2.3%, where
    // `between` is +11.8%).
    //
    // Pinned to the reference ANGLE, never to `flap: "standard"`. 18x14 is not
    // a uniform scale of the 20x16 reference, so transplanting the ratios onto
    // it would reproduce exactly the bug recorded at the top of this file: the
    // half-width moves with the width and the depth with the height, so the
    // angle comes out somewhere nobody chose. Only a uniform scale preserves an
    // angle; everything else has to pin it.
    angle: "reference",
    draft: true,
    note: "aspect 1.286; the hinted member of the mail lineage. Second sharpest overall and the only candidate that keeps BOTH the mail aspect and the in-place area parity with the ring",
  },
  {
    id: "mail-15",
    w: 18,
    h: 15,
    angle: "reference",
    draft: true,
    // The best box INSIDE the area-parity band, found 2026-07-31 by sweeping h
    // from 12 to 18 and scoring every step at dpr 1. That sweep is the useful
    // artifact of this round even though this candidate is a hedge: it shows
    // the tension is structural. Sharpness at dpr 1 and the reference mail
    // aspect pull in opposite directions on an 18-wide box, and no height gets
    // both.
    //
    // Re-derived under the two-edge metric that shipped, rather than left as
    // the single-coordinate figures the sweep was first run with: inside
    // |area| <= 5% the best total is this one's 1.542, against the withdrawn
    // box's 1.950, and every box scoring under 1.2 costs at least 9% of area
    // (h 13.0 is 1.17 at -9.4%, h 15.6 is 1.02 at +9.0%).
    //
    // y 4.5 / 19.5 is a half-integer pair, which is why it wins 14px outright -
    // 0.250, the best 14px cell in the whole field, ahead of the 0.333 that
    // `between`, `stock` and the replaced glyph all share - and then gives it
    // back at 16, where 4.5 x 2/3 = 3.0 lands on a boundary and straddles.
    note: "aspect 1.2, area +4.8%. The sharpest box that stays inside the area-parity band, and the best 14px cell in the field; mediocre at 15 and 16",
  },
  {
    id: "stock",
    w: 20,
    h: 16,
    flap: "standard",
    note: "the reference box, drawn on this set's construction; the ONLY candidate that costs column alignment, so it is the one cell that tests whether that alignment is worth anything",
  },
  {
    id: "square-soft",
    w: 18,
    h: 18,
    flap: "soft",
    note: "the aspect-versus-angle diagnostic: full square alignment, flap angle corrected to 122.0 degrees. If this still reads as a placeholder, aspect is the culprit and the angle is a side issue",
  },
];
// Promoted 2026-07-31: `mail` -> `between`, on pixel-hinting evidence the
// 2026-07-29 round did not have. See that candidate's block for what decided it
// and what it cost. Both boxes stay declared, with their reasons intact.
export const ENVELOPE_DEFAULT = "between";

/** A candidate's box resolved onto the grid. Every box is centred on VIEW. */
export const envelopeBox = (id = ENVELOPE_DEFAULT) => {
  const c =
    ENVELOPE_CANDIDATES.find((e) => e.id === id) ??
    ENVELOPE_CANDIDATES.find((e) => e.id === ENVELOPE_DEFAULT);
  const x0 = n((VIEW - c.w) / 2);
  const y0 = n((VIEW - c.h) / 2);
  return { ...c, x0, y0, x1: n(x0 + c.w), y1: n(y0 + c.h), aspect: n(c.w / c.h) };
};

const flapGeom = (id, boxId = ENVELOPE_DEFAULT) => {
  const v = FLAP_VARIANTS.find((f) => f.id === id) ?? FLAP_VARIANTS.find((f) => f.id === FLAP_DEFAULT);
  const b = envelopeBox(boxId);
  const top = n(b.y0 + v.top * b.h);
  const vertex = n(b.y0 + v.vertex * b.h);
  const depth = n(vertex - top);
  // Half-width is the BOX's. This is the line that was previously hardcoded to
  // INK_BOX / 2, which is what made a 20-wide reference read as 9 wide.
  return { ...v, top, vertex, depth, angle: n((2 * Math.atan(b.w / 2 / depth) * 180) / Math.PI) };
};
export const flapVariant = (id, boxId) => flapGeom(id, boxId);

/**
 * The reference glyph's vertex angle, DERIVED rather than typed: the shipped
 * flap ratios on the reference box. No magic number, and it moves if either
 * input ever does.
 */
export const referenceAngle = () => flapGeom(FLAP_DEFAULT, "stock").angle;
// Verified 2026-07-31, when `between` was promoted on the claim that pinning
// carries the angle across a box change. Every angle-pinned candidate reports
// 120.378 with a delta of exactly 0 from the reference - but that alone is what
// a silently broken computation would also look like. The discriminating
// evidence is the DEPTH: `stock` (20 wide) needs 5.7296 to reach that angle
// while every 18-wide box needs 5.1566. Different depths, one angle, which is
// the whole point of pinning and is not something a stuck computation produces.
// `mail` reaches it via the ratio path rather than the angle path, which is the
// 2026-07-29 record's claim that a uniform 0.9 scale preserves an angle, still
// holding.

/**
 * The flap a candidate actually uses.
 *
 * A candidate declares EITHER a flap variant (ratios, the original model) or a
 * target `angle`. The angle model is the one this re-review added, and it is the
 * better of the two: ratios do not survive a change of box, angles are what the
 * eye reads. Depth follows from the angle and the box's own half-width, so any
 * two candidates pinned to the same angle carry the identical V whatever their
 * height.
 */
export const candidateFlap = (id = ENVELOPE_DEFAULT) => {
  const b = envelopeBox(id);
  if (b.angle == null) return flapGeom(b.flap, b.id);
  const target = b.angle === "reference" ? referenceAngle() : b.angle;
  const topRatio = FLAP_VARIANTS.find((f) => f.id === FLAP_DEFAULT).top;
  const depth = n(b.w / 2 / Math.tan((target * Math.PI) / 360));
  const top = n(b.y0 + topRatio * b.h);
  return {
    id: `${n(target)}deg`,
    top,
    vertex: n(top + depth),
    depth,
    angle: n(target),
    note: "pinned to a target angle, not to flap ratios",
  };
};

// The ring. Diameter 18 = the ink box exactly.
export const RING_R = INK_BOX / 2;
// The aperture family's interior ring, inset inside the shared frame.
export const INNER_R = 4.5;
// The filled core of the round agent mark, and its hollow counterpart.
export const CORE_R = 2.5;

// The round-agent family's non-round alternates. Both fill the 18x18 ink box
// exactly, so they sit on the same optical footing as the ring and the chip.
// The hexagon is stretched horizontally (a regular pointy-top hexagon is only
// 15.6 wide at 18 tall) rather than left short, because the ink box is the
// whole point of this set.
export const HEX_PTS = [
  [12, INK_MIN],
  [INK_MAX, 7.5],
  [INK_MAX, 16.5],
  [12, INK_MAX],
  [INK_MIN, 16.5],
  [INK_MIN, 7.5],
];
export const DIAMOND_PTS = [
  [12, INK_MIN],
  [INK_MAX, 12],
  [12, INK_MAX],
  [INK_MIN, 12],
];

// The Command Terminal prompt. FROZEN: lifted verbatim from the desktop app's
// CommandTerminalIcon, which already solved state-without-shape-change and is
// the seed for this set. Do not retune these; the glyph already shipped.
export const PROMPT_D = "M7.5 9.5 L10.5 12 L7.5 14.5";
export const PROMPT_BAR_D = "M12.5 14.5 H16.5";
// The "new terminal" morph: the same chip with a + instead of the prompt, so
// that button reads as a terminal rather than a bare plus.
export const PLUS_V_D = "M12 8.5 V15.5";
export const PLUS_H_D = "M8.5 12 H15.5";

// BASELINE ONLY: the stock loader arc (r=9 about 12,12), kept exact so the
// "what ships today" control band is a true like-for-like. No mark in the set
// uses it; the set's working ring is a full circle with a normalized dash.
export const ARC_D = "M21 12a9 9 0 1 1-6.219-8.56";

// ---------------------------------------------------------------------------
// The activity RING CONTROLS the desktop app already ships. These are not
// candidates; they are the constraint. The task-detail pause button and the
// Command Terminal stop button are both a stock Circle at size 20 carrying a
// solid centred glyph, tinted by the same two tokens as this set:
//
//   working    text-active,    animate-spin, [stroke-dasharray:47_16]
//   needs you  text-attention, static, no dash
//   rest       a stock circle-stop glyph at 18
//
// Three things follow, and they are why this block lives here rather than in a
// comment on the review page.
//
// 1. 47/16 on a circumference of 62.83 is 74.8/25.2. The app already chose the
//    3/4 chasing arc by hand, twice, in two files, as a magic pair that breaks
//    silently if the ring size ever changes. That is exactly the drift this
//    package exists to stop.
// 2. A rotating dashed circle and a marching dashed circle are visually
//    identical, so unifying the set on the march primitive costs these controls
//    nothing on screen while giving every non-round mark the same treatment.
// 3. The controls use r=10, not this set's 18 ink box, and deliberately so:
//    the stock loader is r=9 and "rendered ~10% smaller" next to them. Any
//    round agent mark has to be judged beside a 20-unit ring, not on its own.
export const CONTROL_RING_R = 10;
export const CONTROL_DASH_ABS = "47 16";
export const CONTROL_RENDER_PX = 20;
// The two KEYLINES this set uses, and the roles they belong to. Declared here so
// the gate can assert extent per role instead of holding every mark to one span.
//
// An indicator is a 14px LABEL in a counter row; a control is a 20px TARGET in a
// header. Different roles, different keylines, and collapsing them onto one is
// what shrank the controls by 10 percent in 2.5.0. Within a keyline each form is
// still sized optically - the envelope is 18 wide and 14.4 tall on the indicator
// keyline, because an envelope's aspect is its identity.
//
// The control span is WRITTEN OUT rather than derived from CONTROL_RING_R, 13
// lines above. That is deliberate and it is the one place in this file where an
// inline number beats the named constant: a keyline is the SPECIFICATION the
// gate holds the geometry to, so deriving it from the geometry makes the
// assertion compare a value to itself. Verified 2026-07-29 - with the span
// written as `(VIEW - 2 * CONTROL_RING_R) / 2` and CONTROL_RING_R set to 9, the
// gate reports ACTIVITY PASS on the exact 2.5.0 regression it exists to catch;
// with the literal, it reports four findings. Do not "clean this up".
//
// BOTH spans are written out as of 2026-07-31. The indicator span used to read
// `[INK_MIN, INK_MAX]`, derived from INK_BOX, which is the same
// compare-a-value-to-itself trap the paragraph above records for the control
// span. It had never bitten because nothing had proposed moving the indicator
// slot; the hinting round did (SLOT_CANDIDATES below).
//
// Verified 2026-07-31 the same way as the control span, by setting INK_BOX to
// 16 and running the gate both ways. With the span DERIVED, the four marks
// whose geometry comes from INK_BOX - the ring and all three terminal marks -
// silently moved from x 3..21 to x 4..20 and the keyline reported nothing,
// because the keyline had moved with them. The single finding was:
//
//   - agent-idle: outline spans x 3..21, off its keyline 4..20 (14-16px label in a counter row)
//
// and the envelope caught it only by accident, because ENVELOPE_CANDIDATES
// declares `w: 18` as a literal rather than deriving it. With the span written
// out, the same INK_BOX change reports all four:
//
//   - agent-working: outline spans x 4..20, off its keyline 3..21 (14-16px label in a counter row)
//   - terminal-idle / terminal-working / terminal-new: the same
//
// So the derived form was not merely tautological, it was inverted: it caught
// the one mark that does NOT derive from the constant and missed every mark
// that does.
export const KEYLINES = {
  indicator: { span: [3, 21], note: "14-16px label in a counter row" },
  control: { span: [(VIEW - 2 * 10) / 2, VIEW - (VIEW - 2 * 10) / 2], note: "20px target in a header" },
};

// The indicator slot itself, as a candidate axis. UNDER REVIEW 2026-07-31.
//
// The shipped 18-unit slot puts every indicator extent on 3 and 21, and its
// interior landmarks on 9 and 12. All four are divisible by 3, which at dpr 1
// and a 16px render is exactly the boundary-straddling case, and so is every
// other 24-grid icon set beside it.
//
// Measured, it is the SOFTEST coordinate in the whole field: total edge
// softness 6.646 across the twelve dpr-by-size cells, behind even the envelope
// box this round opened on (6.417). A 16-unit slot (x 4..20, ring r=8) scores
// 5.312. So if the report is about the set as a whole rather than about the
// envelope alone, the slot is the bigger cause - and also much the more
// expensive thing to move, which is why it is information here and not a
// promotable cell.
//
// This axis is DELIBERATELY not promotable in the same breath as an envelope
// box, and the sheet says so. INK_BOX is imported by lib/ui-glyphs.mjs, so
// moving the slot regenerates assets/ui/kanban.svg and the
// resources/mobile/kanban-tab-* rasters, and ui-glyph-geometry.md records that
// those rasters are keyed to the iOS tab bar and that changing them invalidates
// the store screenshots captured against them. It also shrinks every indicator
// by 11%, which is a legibility judgement, not a hinting one.
//
// So these render on the review sheet as INFORMATION. Promoting one is a
// separate decision with its own consumer coordination.
export const SLOT_CANDIDATES = [
  {
    id: "slot-18",
    ink: INK_BOX,
    ringR: RING_R,
    shipped: true,
    note: "what ships: x 3..21, ring r=9. Every extent divisible by 3. Softest coordinate in the field, total 6.646",
  },
  {
    id: "slot-16",
    ink: 16,
    ringR: 8,
    draft: true,
    note: "x 4..20, ring r=8. Sharpest in the field at 5.312, and the most expensive: it costs 11% of every indicator's size, the shared ui grid, and desktop's width=18 and r=9 pins",
  },
];
export const SLOT_DEFAULT = "slot-18";
/** A slot candidate's geometry resolved onto the grid, for the sheet only. */
export const slotBox = (id = SLOT_DEFAULT) => {
  const c = SLOT_CANDIDATES.find((s) => s.id === id) ?? SLOT_CANDIDATES.find((s) => s.id === SLOT_DEFAULT);
  const min = n((VIEW - c.ink) / 2);
  return { ...c, min, max: n(VIEW - min), span: [min, n(VIEW - min)] };
};
/** The keyline a mark belongs to. Role, not size: the id prefix is the role. */
export const keylineFor = (mark) => (mark.id.startsWith("control-") ? KEYLINES.control : KEYLINES.indicator);

// The controls have a HIGHER floor than the indicators: the centred glyph sits
// inside the ring, so it gets a fraction of an already small box. At 12px the
// pause bars merge into a single dot. They render at 20 everywhere today, which
// is comfortable, but this is the number that must not be quietly ignored if a
// consumer ever puts a control in a dense row.
export const CONTROL_FLOOR_PX = 16;

// The centred glyphs, in viewBox units (authored in the app as CSS boxes at a
// 20px render, so 24/20 scales them onto this grid).
const CTRL = VIEW / CONTROL_RENDER_PX;
export const PAUSE_BAR = { w: n(2 * CTRL), h: n(8 * CTRL), gap: n(2 * CTRL) };
export const STOP_SQUARE = { s: n(8 * CTRL), r: n(2 * CTRL) };

// ---------------------------------------------------------------------------
// The 16-unit small-size master. DRAFT, review-sheet only, 2026-07-31.
//
// The shape the hinting brief prescribed: a second master authored on a 16 grid
// so a 16px render is scale 1 and lands exactly. It is declared here rather
// than in the generator because it is geometry, and geometry lives in this file
// even when it exists only to be rendered and rejected.
//
// A uniform 2/3 scale of the shipped 24-grid drawing, then snapped to the 16
// lattice, so this band compares MASTERS rather than comparing two different
// designs: ring r=9 -> 6 exactly, ink box 18 -> 12 exactly, envelope 18 x 14.4
// -> 12 x 9.6, snapped to 12 x 10.
//
// Two stroke weights, because the weight is the whole argument:
//   2.0  at a 16px render this is 2.0 device px, edges on integers, genuinely
//        exact - and 50% heavier than the 1.3333px icon-library glyphs beside
//        it, which are on their own 24 grid and stay there.
//   1.5  1.5 device px, +12.5% weight, but an ODD half-width, so its edges
//        cannot both be integers at any centreline. Best case is a solid core
//        with 0.25 halos. Exactness is not on the table at this weight.
//
// Neither helps 14 or 15, which scale by 0.875 and 0.9375. Closer to 1 than the
// 24 grid's 0.583 and 0.625, and still not exact. The band exists so that is
// looked at rather than argued.
export const SMALL_MASTER = {
  id: "grid-16",
  view: 16,
  ink: 12,
  ringR: 6,
  env: { w: 12, h: 10, r: 1.5 },
  strokes: [2, 1.5],
  draft: true,
  note: "the brief's prescribed second master: a lattice-snapped 2/3 scale of the shipped drawing on a 16 viewBox",
};

/**
 * One small-master form ("ring" or "envelope") as a standalone SVG.
 *
 * A separate emitter from markSvg because that one hardcodes the 24 viewBox and
 * the set's stroke, which is correct for everything that ships. Nothing here
 * reaches assets/: the ACTIVITY gate asserts the 24 grid on every file in
 * assets/activity, so a 16-viewBox master could not ship without that assertion
 * being deliberately reopened.
 */
export function smallMasterSvg(form, { size = SMALL_MASTER.view, stroke = STROKE } = {}) {
  const { view, ink, ringR, env } = SMALL_MASTER;
  const c = view / 2;
  let body;
  if (form === "ring") {
    body = `<circle cx="${c}" cy="${c}" r="${ringR}"/>`;
  } else {
    const x0 = n((view - env.w) / 2);
    const y0 = n((view - env.h) / 2);
    // Pinned to the reference vertex angle, never to the flap ratios. 12 x 10
    // is not a uniform scale of the 20 x 16 reference, so ratios would drift
    // the angle exactly as they did on the 24 grid. Same rule, smaller master.
    const depth = n(env.w / 2 / Math.tan((referenceAngle() * Math.PI) / 360));
    const top = n(y0 + FLAP_VARIANTS.find((f) => f.id === FLAP_DEFAULT).top * env.h);
    body =
      `<rect x="${x0}" y="${y0}" width="${env.w}" height="${env.h}" rx="${env.r}"/>` +
      `<path d="M${x0} ${top} L${c} ${n(top + depth)} L${n(x0 + env.w)} ${top}"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" width="${size}" height="${size}"` +
    ` fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"` +
    ` aria-hidden="true">${body}</svg>`
  );
}

// ---------------------------------------------------------------------------
// Motion. Two candidate primitives; the artifact decides between them.
// ---------------------------------------------------------------------------

// M1 "march": a dash flows around a closed outline via stroke-dashoffset.
// Ratios are per-mark and are NOT inherited - pathLength makes the math
// geometry-independent, it does not make one ratio right for every silhouette.
//
// The spinner is a 3/4 arc chasing, which is lucide's LoaderCircle proportion
// exactly. A short 25/75 dash was drafted first and rejected on the contact
// sheet: at rest it leaves a fragment rather than a spinner, and lucide's arc
// is the shape the eye already knows.
export const DASH_SPINNER = "75 25";
// The chip is a ring with a travelling gap, which reads as busy rather than
// as loading. This one already ships in the desktop Command Terminal glyph.
export const DASH_CHIP = "65 35";
export const MARCH_MS = 1400;

// M2 "rotation": only coherent on a radially symmetric mark - a rotating
// envelope or a rotating chip is the "tilted" artifact, not motion.
//
// PROMOTED to the production primitive for every ROUND working mark, 2026-08-07,
// on a performance finding rather than a visual one. `stroke-dashoffset` is a
// paint property, so Chromium cannot composite it: a marching mark stops
// producing frames for exactly as long as the consumer's main thread is blocked,
// and the desktop app measured 194 renderer stalls in 3.6 hours, worst 703ms.
// The indicator visibly hitched every time. `transform` composites, so a
// rotating mark keeps turning through a blocked main thread.
//
// Measured, not assumed, in Chromium via CDP `Page.startScreencast` (which is
// pushed from the compositor) against a 4000ms main-thread block, headless and
// headed, with a rAF witness confirming the block: an HTML rotation produced
// 222/355 distinct frames during the block, an SVG <g> rotation 182/367, and the
// dashoffset march produced ZERO. So the SVG-level rotation this set already
// shipped is composited, and no HTML wrapper is needed to get it.
//
// On a circle the two primitives are not merely similar, they are the SAME
// image: with pathLength normalizing the perimeter to 100, a dash-offset shift
// of d is exactly a rotation of d percent of 360 degrees. The chip is the one
// that cannot follow, since a rounded rect is not radially symmetric.
//
// The period is the SET's period, not lucide's 1200ms it was drafted from. Two
// reasons, both load-bearing: a ring must rotate at the rate its dash used to
// march or the swap is a visible speed change rather than a pure performance
// change, and marching and spinning marks share a row (an agent ring sits beside
// a Command Terminal chip in the project sidebar), so a different period would
// break the lockstep the consumers' timeline anchoring exists to give them.
export const SPIN_MS = MARCH_MS;

// M3 "blink": the interior pulses its OPACITY while the outline holds. For the
// terminal chip that interior is the shell prompt, so a working terminal is a
// solid chip whose prompt pulses - which is what a live shell actually looks
// like. Which element carries it is a LEGIBILITY decision made at the indicator
// floor, not at review size; see `chip()` for what that cost 2.8.0.
//
// This exists because the chip cannot rotate and the reason is geometric, not a
// Chromium limitation, so no amount of engineering was going to rescue the
// march here. A composited animation can only drive `transform` or `opacity`. To
// travel a dash along a perimeter with a transform, the transform has to map the
// shape onto ITSELF while advancing arc length - that is the shape's symmetry
// group. A circle's is continuous (rotation by any angle), which is exactly why
// the ring swap is free. A rounded square's is discrete: four 90 degree
// rotations and four reflections, nothing in between. There is no continuous
// family to animate.
//
// Three alternatives were considered and rejected before changing the design:
//   - A rotating MASK. A rigidly rotating boundary sweeps at constant ANGULAR
//     rate, and on this chip the distance from centre runs 9 at a side midpoint
//     to 12.73 at a corner, so the gap would stretch and shrink about 41% every
//     lap. Rejected on appearance, before compositing even came into it.
//   - N dash SEGMENTS crossfading their opacity. Hard-edged with `steps()` means
//     a visibly quantized gap; soft-edged with a linear ramp turns the crisp gap
//     into a comet tail; and either way it is N composited layers per mark, on a
//     glyph that renders at 16px.
//   - Giving the working terminal the RING silhouette so it could rotate. It
//     would then collide with `agent-working`, which sits in the same sidebar
//     row, and with the control marks, which are already ring-plus-interior.
//
// Same period as the other two, for the same lockstep reason. The trough is 0.06
// rather than 0: at the 12px floor a fully absent prompt reads as a mark that has
// lost a piece rather than as one between blinks.
export const BLINK_MS = MARCH_MS;
export const BLINK_REST_OPACITY = 0.06;

// Reduced motion is a rendering, not a mute button, and it is PER MARK:
//   keep-dash  rest holding the dash (a stopped short arc reads as a spinner)
//   drop-dash  rest with no dash at all (freezing a 65/35 ring leaves a solid
//              ring with a hole punched in it, which reads as broken)
//   static     the mark never moved
export const REST_KEEP = "keep-dash";
export const REST_DROP = "drop-dash";
export const REST_STATIC = "static";

// ---------------------------------------------------------------------------
// Element builders.
// ---------------------------------------------------------------------------

const rect = (x, y, w, h, r) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" pathLength="${PATH_LENGTH}"/>`;

const circle = (cx, cy, r) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" pathLength="${PATH_LENGTH}"/>`;

const path = (d) => `<path d="${d}"/>`;

const polygon = (pts) =>
  `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" pathLength="${PATH_LENGTH}"/>`;

// A filled element inside an otherwise stroked mark. Still currentColor, so it
// tints with the surface exactly like the stroke does.
const disc = (cx, cy, r) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="currentColor" stroke="none"/>`;

const inkBox = (r) => rect(INK_MIN, INK_MIN, INK_BOX, INK_BOX, r);

// Perimeter of a closed outline in USER UNITS, so a dash can be expressed
// without pathLength. Browsers honour pathLength on every shape; librsvg (the
// rasterizer behind sharp) and react-native-svg do not reliably, and a dash
// silently falls back to user units there - which on a 56-unit circle means a
// "75" dash covers the whole ring and the motion vanishes. The lib owns the
// geometry, so it can hand every runtime the numbers it can actually use.
export const circlePerimeter = (r) => n(2 * Math.PI * r);
export const rrectPerimeter = (w, h, r) => n(2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r);
export const polyPerimeter = (pts) =>
  n(pts.reduce((sum, [x, y], i) => {
    const [px, py] = pts[(i + 1) % pts.length];
    return sum + Math.hypot(px - x, py - y);
  }, 0));

/** A mark's `dash` ratio resolved into user units for a runtime without pathLength. */
export function dashInUserUnits(mark) {
  if (!mark.dash || !mark.perimeter) return null;
  return mark.dash
    .split(/\s+/)
    .map((part) => n((Number(part) / PATH_LENGTH) * mark.perimeter))
    .join(" ");
}

// The full-width V. At FLAP_TOP the side walls are past the corner radius, so
// the flap meets them cleanly - the same full-bleed flap lucide's Mail uses.
const flap = (top, vertex, x0 = INK_MIN, x1 = INK_MAX) =>
  path(`M${n(x0)} ${n(top)} L${n(VIEW / 2)} ${n(vertex)} L${n(x1)} ${n(top)}`);

// ---------------------------------------------------------------------------
// Marks. Each returns { outline, interior }: `outline` is the single closed
// element a marching dash can ride, `interior` is everything else. Splitting
// them is what lets one motion primitive serve every silhouette.
// ---------------------------------------------------------------------------

/**
 * The envelope, on a named candidate's box and flap.
 *
 * The parameter DEFAULTS rather than being required: d1, the retired d2a and
 * BASELINE all call this bare, and d2a is still constructed at module load even
 * though it is retired. A required parameter would hand it an undefined box and
 * throw on import, which would break check-invariants.mjs, whose contract is
 * that importing a lib has no side effects.
 */
export const envelopeWith = (boxId, flapId) => {
  const b = envelopeBox(boxId);
  const f = flapGeom(flapId, b.id);
  return {
    outline: rect(b.x0, b.y0, b.w, b.h, R_ENVELOPE),
    // The box's own width, not INK_BOX: a 20-wide candidate has to bleed to its
    // own edges or the flap floats inside the rect.
    interior: flap(f.top, f.vertex, b.x0, b.x1),
    // (w, h), not (INK_BOX, INK_BOX). Nothing reads this today - agent-idle
    // carries no dash, so dashInUserUnits returns null and the manifest never
    // sees it - but held square it is silently wrong for every non-square box
    // and any future dashed envelope would inherit the bug.
    perimeter: rrectPerimeter(b.w, b.h, R_ENVELOPE),
  };
};

export const envelope = (candidate = ENVELOPE_DEFAULT) => {
  const b = envelopeBox(candidate);
  const f = candidateFlap(candidate);
  return {
    outline: rect(b.x0, b.y0, b.w, b.h, R_ENVELOPE),
    interior: flap(f.top, f.vertex, b.x0, b.x1),
    perimeter: rrectPerimeter(b.w, b.h, R_ENVELOPE),
  };
};

/**
 * Total stroked path length of a mark, in grid units.
 *
 * For a STROKED glyph optical weight is ink length x stroke width, not enclosed
 * area. The distinction matters here: by area an 18x14.4 envelope looks 20%
 * lighter than the 18x18 ring box, which reads as a problem; by ink it lands
 * within 2% of the terminal chip, and the SQUARE envelope is the outlier. The
 * sheet prints this rather than asserting either.
 */
const polylineLength = (d) => {
  let x = 0;
  let y = 0;
  let len = 0;
  for (const tok of d.match(/[MLHV][^MLHVZ]*/gi) ?? []) {
    const cmd = tok[0].toUpperCase();
    const nums = (tok.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (cmd === "M") {
      [x, y] = nums;
      continue;
    }
    const nx = cmd === "H" ? nums[0] : cmd === "V" ? x : nums[0];
    const ny = cmd === "V" ? nums[0] : cmd === "H" ? y : nums[1];
    len += Math.hypot(nx - x, ny - y);
    x = nx;
    y = ny;
  }
  return len;
};

export const envelopeInk = (candidate = ENVELOPE_DEFAULT) => {
  const b = envelopeBox(candidate);
  const f = candidateFlap(candidate);
  return n(rrectPerimeter(b.w, b.h, R_ENVELOPE) + 2 * Math.hypot(b.w / 2, f.depth));
};
export const chipInk = () =>
  n(rrectPerimeter(INK_BOX, INK_BOX, R_CHIP) + polylineLength(PROMPT_D) + polylineLength(PROMPT_BAR_D));
export const ringInk = () => circlePerimeter(RING_R);

export const ring = () => ({
  outline: circle(VIEW / 2, VIEW / 2, RING_R),
  interior: "",
  perimeter: circlePerimeter(RING_R),
});

// Not closed and not dashed: the rotation candidate turns the whole arc.
export const arc = () => ({ outline: path(ARC_D), interior: "", perimeter: null });

/**
 * `blink: true` moves the WHOLE PROMPT out of the interior into its own field, so
 * the blink primitive has something to ride. Everything else is identical, which
 * is the point: the working chip is the idle chip, and the only difference is
 * which of its parts is allowed to move.
 *
 * The whole prompt, not the bar alone. 2.8.0 blinked the bar and it was reported
 * illegible in the consumer's project sidebar, which is where this mark lives at
 * 16px. Measured rather than argued: the bar is 4 units, so it draws 2.7px at a
 * 16px render, against the 15.6px of perimeter that the march it replaced put in
 * motion. The whole prompt is 11.8 units, or 7.9px - three times the moving ink,
 * with no geometry change and no new constant. The bar was judged at 88px, where
 * it draws 14.7px and reads perfectly well. The lesson is the one this set's own
 * isolation sheets already encode: a candidate for an INDICATOR is unreviewed
 * until it has been seen at the indicator floor, and that applies to motion, not
 * just to form.
 *
 * Blinking MORE than the prompt was weighed and rejected. The outline, or the
 * whole mark, moves the most ink, but both fade the glyph as a whole - and the
 * consumers encode state in TONE, a working terminal in the active token and a
 * resting one muted. A whole-mark fade therefore makes a working terminal
 * periodically read as a resting one, so the motion would fight the colour
 * channel. Holding the outline at full strength is what prevents that.
 */
export const chip = ({ plus = false, blink = false } = {}) => {
  const prompt = path(PROMPT_D) + path(PROMPT_BAR_D);
  return {
    outline: inkBox(R_CHIP),
    interior: plus ? path(PLUS_V_D) + path(PLUS_H_D) : (blink ? "" : prompt),
    ...(blink && !plus ? { blink: prompt } : {}),
    perimeter: rrectPerimeter(INK_BOX, INK_BOX, R_CHIP),
  };
};

/**
 * A slot candidate's ring, for the review sheet only.
 *
 * The ring alone, not the whole set, because the ring IS the slot: its extrema
 * are the keyline, so it is the mark whose hinting the slot decides. The chip's
 * rect has the identical extrema by construction, and its prompt interior is
 * authored for the 18 slot, so rescaling it would put a second decision inside
 * a cell that exists to isolate one.
 */
export const slotRing = (id = SLOT_DEFAULT) => {
  const s = slotBox(id);
  return {
    outline: circle(VIEW / 2, VIEW / 2, s.ringR),
    interior: "",
    perimeter: circlePerimeter(s.ringR),
    slot: s,
  };
};

// The aperture family: one shared frame, three interiors. Parity by
// construction, at the cost of a third element inside the ink box.
// RETIRED 2026-07-28: this was D3's idle mark. Widening and deepening the flap
// did not rescue it - inside a frame it reads as a disclosure chevron, not as
// mail. D3 now uses the ring for both agent states. Kept declared so the
// rejection is recorded rather than rediscovered.
export const apertureFlap = () => ({
  outline: inkBox(R_CHIP),
  interior: flap(INK_MIN + 0.278 * INK_BOX, INK_MIN + 0.667 * INK_BOX, INK_MIN + 2.5, INK_MAX - 2.5),
  perimeter: rrectPerimeter(INK_BOX, INK_BOX, R_CHIP),
});
export const apertureRing = () => ({
  outline: inkBox(R_CHIP),
  interior: circle(VIEW / 2, VIEW / 2, INNER_R),
  perimeter: rrectPerimeter(INK_BOX, INK_BOX, R_CHIP),
});
export const apertureChip = () => chip();

// ---------------------------------------------------------------------------
// The round-agent family. Shape encodes WHAT a mark is (an agent is round, a
// terminal is square); colour and motion encode its state. That is the
// separation the brief asked for, and none of D1/D2a/D2b/D3 actually delivers
// it - they all spend shape on state and then have nothing left to say what the
// mark is. Both agent states are one silhouette here, so the two counters still
// render side by side, each with its own number.
// ---------------------------------------------------------------------------

const CX = VIEW / 2;

/** A closed outline with no dash: the resting form of a round agent mark. */
export const solidRing = () => ({
  outline: circle(CX, CX, RING_R),
  interior: "",
  perimeter: circlePerimeter(RING_R),
});

/** Ring with a filled core. Fill is a state channel that survives both
 *  colourblindness and reduced motion, unlike colour or motion alone.
 *  The working state drops the core entirely rather than hollowing it: a
 *  hollow core at r=2.5 with a 2-unit stroke is almost solid, so at 14px the
 *  two states became indistinguishable, which defeated the channel exactly
 *  where it was needed. Present versus absent survives any size. */
export const ringCoreFilled = () => ({
  outline: circle(CX, CX, RING_R),
  interior: disc(CX, CX, CORE_R),
  perimeter: circlePerimeter(RING_R),
});

/** Concentric rings: the D3 aperture reading, freed from its square frame. */
export const apertureRings = () => ({
  outline: circle(CX, CX, RING_R),
  interior: circle(CX, CX, INNER_R),
  perimeter: circlePerimeter(RING_R),
});

export const hexagon = () => ({
  outline: polygon(HEX_PTS),
  interior: "",
  perimeter: polyPerimeter(HEX_PTS),
});

// ---------------------------------------------------------------------------
// The shipped controls, rebuilt from their source so the sheet compares against
// the real thing. Not candidates: a candidate has to survive BESIDE these.
// ---------------------------------------------------------------------------

const solidRect = (x, y, w, h, r) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="currentColor" stroke="none"/>`;

// `scale` shrinks the centred glyph with the ring, so the glyph-to-ring
// proportion the controls already ship is preserved on either grid.
const pauseBars = (scale = 1) => {
  const w = n(PAUSE_BAR.w * scale);
  const h = n(PAUSE_BAR.h * scale);
  const gap = n(PAUSE_BAR.gap * scale);
  const y = n(CX - h / 2);
  return solidRect(CX - gap / 2 - w, y, w, h, w / 2) + solidRect(CX + gap / 2, y, w, h, w / 2);
};
const stopSquare = (scale = 1) => {
  const s = n(STOP_SQUARE.s * scale);
  return solidRect(CX - s / 2, CX - s / 2, s, s, n(STOP_SQUARE.r * scale));
};

/**
 * The pause / stop control ring. `glyph` is "pause" or "stop".
 *
 * Ships at `CONTROL_RING_R` (10), the CONTROL keyline. `onGrid: true` is the
 * REJECTED alternative, kept only so the review sheet can render the comparison
 * it was rejected from: it drops the ring to the indicator's `RING_R` (9) and
 * scales the centred glyph by the same factor so the glyph-to-ring proportion
 * survives. Nothing under `CONTROLS` below passes it.
 *
 * Corrected 2026-07-29. This docstring used to argue FOR onGrid as the
 * direction of travel - "Once every mark fills an 18 ink box, r=9 IS the set's
 * ring, the controls join the family, and the hand-computed 47/16 pair is
 * replaced by the same pathLength-normalized 75/25 every other mark uses." That
 * premise was reverted; see the dated note at the CONTROLS call site below.
 * Briefly shipping r=9 overrode a human judgement recorded in the desktop app's
 * own source, that r=9 "rendered ~10% smaller" beside these buttons, and an
 * indicator (a 14px label) and a control (a 20px target) are different roles
 * that take different keylines. Leaving the argument here as current made the
 * file assert both positions at once, 100 lines apart.
 *
 * The last clause is the part that survived the revert, and it survived
 * INTACT: pathLength 75/25 on r=10's circumference of 62.83 resolves to
 * 47.12/15.71, so the normalized dash reproduces the app's hand-computed
 * `47 16` almost exactly. The cleanup never depended on the radius moving.
 */
export const controlRing = (glyph, { onGrid = false } = {}) => {
  const r = onGrid ? RING_R : CONTROL_RING_R;
  const scale = onGrid ? RING_R / CONTROL_RING_R : 1;
  return {
    outline: circle(CX, CX, r),
    interior: glyph === "pause" ? pauseBars(scale) : stopSquare(scale),
    perimeter: circlePerimeter(r),
  };
};

const controlStates = (glyph, opts) => [
  { id: "needs-you", tone: "attention", ...controlRing(glyph, opts), motion: null, rest: REST_STATIC },
  { id: "working", tone: "active", ...controlRing(glyph, opts), motion: "spin", dash: DASH_SPINNER, rest: REST_KEEP },
];

/** Each control as shipped, and the same control brought onto the set's grid. */
export const CONTROLS = [
  {
    id: "pause",
    label: "Pause",
    where: "task detail header",
    states: controlStates("pause"),
    onGrid: controlStates("pause", { onGrid: true }),
  },
  {
    id: "stop",
    label: "Stop",
    where: "Command Terminal header",
    states: controlStates("stop"),
    onGrid: controlStates("stop", { onGrid: true }),
  },
];

export const diamond = () => ({
  outline: polygon(DIAMOND_PTS),
  interior: "",
  perimeter: polyPerimeter(DIAMOND_PTS),
});

// ---------------------------------------------------------------------------
// The candidate directions. All draft until one is picked from the artifact.
//
// `retired` records a direction the review has already ruled out. Retired
// directions stay declared, the way superseded sprite poses do, so the decision
// history survives; `LIVE` is what the review sheet renders.
//
// THE GOVERNING CRITERION, settled at review 2026-07-28 and worth stating
// before the list because it is what decided it: the needs-you mark has to be
// construable, at a glance, as "that agent finished and there is something here
// for you". An abstract mark cannot do that. Rings, concentric rings and
// control silhouettes all read as decoration or as loading - a bullseye, or an
// ad - however well they satisfy grid parity, adjacency and colourblind
// redundancy. Those tests can only eliminate; they cannot select. Meaning
// selects, and the envelope is the only mark in the field that carries it.
//
// `motion` is the primitive the mark's own state uses. `rest` is its
// reduced-motion rendering. A direction whose working mark is not radially
// symmetric CANNOT use rotation - noted per direction, because it narrows the
// motion choice rather than leaving it open.
// ---------------------------------------------------------------------------

/**
 * One silhouette, two named marks. `-idle` is static, `-working` carries the
 * dash and the motion; the geometry is identical, which is exactly why they are
 * named rather than composed. A consumer picks a mark, it never assembles one
 * out of a tone plus an animation class, because that assembly step is where
 * the desktop, mobile and web renderings drift apart.
 *
 * There is no `-rest` mark: rest is the idle GEOMETRY in the muted tone, and
 * tone is the consumer's to apply since everything ships currentColor.
 */
const statePair = (id, role, parts, { dash, rest, motion = "march", workingParts = parts }) => [
  { id: `${id}-idle`, role: `${role}, idle`, silhouette: id, state: "idle", tone: "attention", ...parts, motion: null, rest: REST_STATIC },
  { id: `${id}-working`, role: `${role}, working`, silhouette: id, state: "working", tone: "active", ...workingParts, motion, dash, rest },
];

export const DIRECTIONS = [
  {
    id: "d1",
    label: "Parity redraw",
    // Promoted 2026-07-28. Deleting the draft flag IS the promotion, the way it
    // is for a sprite pose; every other direction keeps its flag and its reason.
    selected: "2026-07-28",
    blurb:
      "Three dedicated marks, normalized onto one 18x18 ink box. The envelope is the only mark in the field that can be read as \"that agent finished and there is something here for you\"; the ring is the only one that reads as still running. Two drawings for two states is what buys that, and shape stays a redundant channel alongside colour into the bargain.",
    rotatable: true,
    marks: [
      // The agent is the one pair whose two states are two different drawings.
      // That is the whole direction: an envelope can be read as "finished, and
      // there is something here for you", a ring as "still running".
      { id: "agent-idle", role: "needs you", silhouette: "envelope", state: "idle", tone: "attention", ...envelope(), motion: null, rest: REST_STATIC },
      // Spins rather than marches, which on a circle is the SAME image (see
      // SPIN_MS) but composited, so the ring keeps turning while a consumer's
      // main thread is blocked. Geometry, dash and period are untouched.
      { id: "agent-working", role: "working", silhouette: "ring", state: "working", tone: "active", ...ring(), motion: "spin", dash: DASH_SPINNER, rest: REST_KEEP },
      // Everything else is one silhouette in two states, named explicitly rather
      // than left for a consumer to compose out of a tone and an animation
      // class. Composition is where three surfaces drift apart.
      //
      // The chip BLINKS as of 2026-08-07, and it is the one mark in this set
      // whose motion change is a design decision rather than a free swap. It
      // marched from 2026-07-28: a 65/35 gap travelling the perimeter. That
      // cannot be composited on a rounded rect for the geometric reason recorded
      // at BLINK_MS, so the chip was the single mark left stalling on a blocked
      // main thread once the rings moved - and it is the mark the project
      // sidebar and the title bar both show, which is where it was reported.
      //
      // Solid outline plus a blinking cursor was chosen over keeping the march,
      // on a rendered side-by-side under a deliberate 3s main-thread block. It
      // costs the travelling gap and buys a mark that reads as a live shell.
      //
      // The dash goes entirely, which is why the rest strategy is now `static`
      // rather than `drop-dash`: with nothing dashed there is nothing to drop.
      // Note what that does NOT change - `terminal-working` at rest was already
      // byte-identical to `terminal-idle`, because drop-dash removed the same
      // dash. The states have only ever differed by tone with motion off.
      ...statePair("terminal", "terminal", chip(), {
        rest: REST_STATIC,
        motion: "blink",
        workingParts: chip({ blink: true }),
      }),
      // The two shipped controls. They were never candidates - they are the rest
      // of the family, and they belong here for one reason: the 47/16 dash they
      // carry is a hand-computed pair duplicated across two desktop files that
      // breaks silently if the radius changes. Marching rather than rotating,
      // which on a circle is visually identical to what they already do.
      //
      // AT THEIR SHIPPED r=10, corrected 2026-07-29. These were briefly moved to
      // the indicator's r=9 on the reasoning that "once every mark fills an 18
      // ink box, r=9 IS the set's ring". That premise is the same one that
      // squared the envelope, and it was wrong here too: it overrode a human
      // judgment recorded in the app's own source, that r=9 "rendered ~10%
      // smaller" beside these buttons.
      //
      // Indicators and controls are different roles and take different keylines.
      // An indicator is a 14px LABEL in a counter row and sits on the 18 slot; a
      // control is a 20px TARGET in a header and sits on 20. The set's own note
      // already said as much - "a header button is a target and a row indicator
      // is a label" - it just did not follow through to the geometry.
      //
      // The cleanup survives intact, which is the point: pathLength 75/25 on a
      // 62.83 circumference resolves to 47.12/15.71 user units, so the packaged
      // mark reproduces the app's hand-computed 47/16 almost exactly. The dash
      // stops being hand-maintained without the radius quietly changing.
      //
      // Rotating again as of 2026-08-07, which is what they did before this set
      // existed. The 2026-07-28 note below records marching as costing them
      // "nothing on screen"; that stayed true, and compositing is what moved
      // them back. The cleanup is untouched either way - the dash is still the
      // set's pathLength ratio, not a hand-computed pair.
      ...statePair("control-pause", "pause button", controlRing("pause"), { dash: DASH_SPINNER, rest: REST_KEEP, motion: "spin" }),
      ...statePair("control-stop", "stop button", controlRing("stop"), { dash: DASH_SPINNER, rest: REST_KEEP, motion: "spin" }),
      // Stateless: the "new terminal" button is an action, not a status, so it
      // has no idle/working pair. It ships because it is the same chip with a +
      // instead of the prompt, and leaving it out would keep one hand-maintained
      // glyph beside eight packaged siblings.
      { id: "terminal-new", role: "new terminal button", silhouette: "terminal", state: "action", tone: "rest", ...chip({ plus: true }), motion: null, rest: REST_STATIC },
    ],
  },
  {
    id: "d2a",
    label: "Envelope twice",
    draft: true,
    // Keeps the envelope, so it passes the meaning test, and still fails: with
    // one silhouette for both states there is nothing that reads as finished
    // versus still running, and with motion off the two are the same drawing.
    retired: "2026-07-28: ruled out at review - one silhouette cannot say done-versus-working, and its rest rendering collapses to the idle mark",
    blurb:
      "One silhouette for both agent states. Keeps the mail envelope, but colour becomes the only channel carrying which state it is.",
    rotatable: false,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...envelope(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...envelope(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d2b",
    label: "Chip twice",
    draft: true,
    // Not an aesthetic rejection. Board agents are persistent and task-bound;
    // Command Terminals are ephemeral and per-project. Borrowing the chip
    // silhouette for agents leaves no way to tell those two things apart in the
    // row, whatever the colour does.
    retired: "2026-07-28: ruled out at review - the chip silhouette makes board agents indistinguishable from ephemeral Command Terminals",
    blurb:
      "The terminal chip silhouette used for the agent states too. Maximum family consistency; the mail envelope is gone.",
    rotatable: false,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...chip(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d3",
    label: "Aperture family",
    draft: true,
    retired: "2026-07-28: ruled out at review - a ring in a frame reads as decoration, not as a message waiting for you",
    blurb:
      "One 18x18 frame, two interiors. The ring is the agent and the prompt is the terminal, so the frame is the family and the interior says which object you are looking at. Both agent states use the ring: amber and still is idle, green with the frame marching is working. Optical parity by construction, and the marching border drops onto every mark unchanged.",
    // The working mark is a ring inside a frame: rotating the glyph tilts the
    // frame, and rotating the ring alone shows nothing. Marching only.
    rotatable: false,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...apertureRing(), motion: null, rest: REST_STATIC },
      // 75/25 rather than the chip's 65/35, and REST_KEEP rather than drop, so
      // the two agent states stay apart with motion off: a frame missing a
      // quarter reads as a square spinner, where one missing a third reads torn.
      { id: "agent-working", role: "working", tone: "active", ...apertureRing(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...apertureChip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d4a",
    label: "Ring",
    draft: true,
    retired: "2026-07-28: ruled out at review",
    blurb:
      "The agent is round, the terminal is square, so shape says what a mark is and never has to say what state it is in. Idle is a closed ring; working is the same ring opened into a chasing arc. Ring versus arc is a static difference, so the two states stay apart with the colour removed and with the motion removed.",
    rotatable: true,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...solidRing(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...ring(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d4b",
    label: "Ring with a core",
    draft: true,
    retired: "2026-07-28: ruled out at review - a ring with a dot reads as a bullseye, and it collides with the stop control besides",
    blurb:
      "The same round agent, with fill carrying the state as well: idle holds a solid core, something sitting there waiting for you, and working drops the core and opens the ring into a chasing arc. Core present versus absent is the one state channel on this page that reads at 12px, in greyscale, with motion off.",
    rotatable: true,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...ringCoreFilled(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...ring(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d4c",
    label: "Aperture",
    draft: true,
    retired: "2026-07-28: ruled out at review - concentric rings read as a bullseye or an ad, never as something waiting for you",
    blurb:
      "D3's inner-ring reading, freed from the square frame that made it collide with the terminal. Two concentric rings read as an aperture or a lens; the outer one opens and marches while working.",
    rotatable: true,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...apertureRings(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...apertureRings(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d5",
    label: "Hexagon",
    draft: true,
    retired: "2026-07-28: ruled out at review",
    blurb:
      "An agent as a node rather than a circle. Reads distinctly against the square at any size, and the flat top and bottom give it a different rhythm from the ring. The shape is a common infrastructure cliche, which is the thing to weigh.",
    rotatable: false,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...hexagon(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...hexagon(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d6",
    label: "Diamond",
    draft: true,
    retired: "2026-07-28: ruled out at review",
    blurb:
      "The most abstract option: a token, not an object. Maximum silhouette distance from the square terminal, at the cost of four sharp points that fight the rounded joins used everywhere else in the set.",
    rotatable: false,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...diamond(), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...diamond(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
  {
    id: "d7",
    label: "Control parity",
    draft: true,
    // The cleanest system argument in the field and still wrong: a pause ring
    // says "this is running, interrupt it". It has no way to say "this stopped
    // and there is something here for you", which is the message the idle mark
    // exists to carry.
    retired: "2026-07-28: ruled out at review - a pause ring reads as a control, never as an idle agent with something waiting",
    blurb:
      "The indicator IS its own control. A board agent shows the pause ring, amber and still for idle, green and spinning for working, which is exactly the button you would press to pause it. A Command Terminal keeps the prompt chip, and its control is the stop ring. Pause against stop is then the whole distinction: a persistent agent is something you interrupt, an ephemeral terminal is something you kill.",
    // The working mark is a ring with a static centred glyph, so it can rotate
    // or march; the centre never moves either way.
    rotatable: true,
    marks: [
      { id: "agent-idle", role: "needs you", tone: "attention", ...controlRing("pause", { onGrid: true }), motion: null, rest: REST_STATIC },
      { id: "agent-working", role: "working", tone: "active", ...controlRing("pause", { onGrid: true }), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      { id: "terminal", role: "terminal", tone: "aggregate", ...chip(), motion: "march", dash: DASH_CHIP, rest: REST_DROP },
    ],
  },
];

/** The directions still under consideration. This is what the review renders. */
export const LIVE = DIRECTIONS.filter((d) => !d.retired);

/**
 * THE SHIPPED SET: the promoted direction. A direction is promoted by deleting
 * its `draft` flag, so exactly one should qualify.
 *
 * Deliberately a FUNCTION, not a module-scope constant that throws. This lib is
 * imported by check-invariants.mjs, whose contract is that importing a lib has
 * no side effects: a throw at module scope would crash the gate before it could
 * report anything, turning a clear finding into a stack trace.
 */
export const promotedDirections = () => DIRECTIONS.filter((d) => !d.retired && !d.draft);
export function shippedSet() {
  const promoted = promotedDirections();
  if (promoted.length !== 1) {
    throw new Error(`expected exactly one promoted direction, found ${promoted.length}`);
  }
  return promoted[0];
}

// What ships today, for a like-for-like control band. lucide's Mail is the
// 20x16 outlier; its LoaderCircle and the desktop's own chip are already 18x18.
export const BASELINE = {
  id: "now",
  label: "What ships today",
  blurb: "The stock mail glyph (20x16 ink) beside the stock loader and the desktop's Command Terminal chip (both 18x18). This band is the control: it is what renders today, not part of the set.",
  // Its working mark IS the rotating lucide arc, so the control band must not
  // claim rotation is unavailable to it.
  rotatable: true,
  marks: [
    {
      id: "agent-idle",
      role: "needs you",
      silhouette: "mail-20x16",
      state: "idle",
      tone: "attention",
      outline: `<rect x="2" y="4" width="20" height="16" rx="2" pathLength="${PATH_LENGTH}"/>`,
      interior: path("m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"),
      perimeter: rrectPerimeter(20, 16, 2),
      motion: null,
      rest: REST_STATIC,
    },
    { id: "agent-working", role: "working", silhouette: "arc", state: "working", tone: "active", ...arc(), motion: "spin", rest: REST_STATIC },
    ...statePair("terminal", "terminal", chip(), { dash: DASH_CHIP, rest: REST_DROP }),
  ],
};

// ---------------------------------------------------------------------------
// The document builder. One place that knows how a mark becomes an <svg>.
// ---------------------------------------------------------------------------

/**
 * Render one mark as a standalone SVG string.
 * `motion` is resolved by the caller (a candidate may be shown marching, spinning,
 * or at rest), so this stays a pure function of the mark plus a presentation.
 */
export function markSvg(mark, { size = 24, motion = mark.motion, resting = false, cls = "" } = {}) {
  const marching = motion === "march" && !resting;
  const spinning = motion === "spin" && !resting;
  const blinking = motion === "blink" && !resting;
  // A drop-dash mark at rest carries no dasharray at all; a keep-dash one holds
  // its dash so the stopped glyph still reads as the mark it is.
  // The dash is what makes EITHER OUTLINE primitive visible: a solid ring
  // rotating shows nothing at all, so spin needs it exactly as much as march
  // does. Blink is not an outline primitive and carries no dash.
  const moving_ = marching || spinning;
  const dash = mark.dash && (moving_ || (resting && mark.rest === REST_KEEP)) ? ` stroke-dasharray="${mark.dash}"` : "";
  const anim = marching ? "kng-march" : spinning ? "kng-spin" : "";
  // Motion rides on ONE part, never on the <svg>. Rotating the whole element
  // would turn the centred glyph with it, which is the tilt artifact: the
  // shipped controls put the animation on the <circle> and leave the pause bars
  // and stop square as static siblings. Same structure here, and the same reason
  // the blinking cursor is its own element rather than the whole interior.
  const outline = mark.outline.replace("/>", `${dash}/>`);
  const moving = anim ? `<g class="${anim}">${outline}</g>` : outline;
  const blinkPart = mark.blink ? (blinking ? `<g class="kng-blink">${mark.blink}</g>` : mark.blink) : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${size}" height="${size}"`,
    ` fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"`,
    cls ? ` class="${cls}"` : "",
    ` data-mark="${mark.id}" data-rest="${mark.rest}" aria-hidden="true">`,
    moving,
    mark.interior,
    blinkPart,
    `</svg>`,
  ].join("");
}

/** A shipped mark's filename. One mark, one file, named exactly as its id. */
export const fileFor = (mark) => `${mark.id}.svg`;

/**
 * The shipped manifest. Framework-agnostic data, so a runtime with no CSS can
 * still render the set correctly - the same reason the mascot ships
 * animations.json beside animations.css.
 *
 * `dashUserUnits` is the load-bearing field: browsers honour pathLength, but
 * librsvg and react-native-svg do not reliably, and a ratio dash silently falls
 * back to user units there, where "75" covers a 56-unit circle entirely and the
 * motion vanishes. The lib owns the geometry, so it hands every runtime the
 * number it can actually use.
 */
export function manifest() {
  const marks = {};
  // DERIVED, never a literal. This read "march" while three of the four working
  // marks rotated, which is the record drift this package's gates exist to stop:
  // a hand-written default is only correct until the set changes under it. The
  // per-mark `motion` is the authority; this says which primitive the set leans
  // on, for a consumer that has to pick one without a mark in hand.
  // At an exact tie there is no dominant primitive, and picking one alphabetically would be a
  // claim the set does not support, so say null instead. Today it is 3 spin to 1 march.
  const tally = {};
  for (const m of shippedSet().marks) if (m.motion) tally[m.motion] = (tally[m.motion] ?? 0) + 1;
  const ranked = Object.keys(tally).sort((a, b) => tally[b] - tally[a] || a.localeCompare(b));
  const tied = ranked.length > 1 && tally[ranked[0]] === tally[ranked[1]];
  const dominant = tied ? null : (ranked[0] ?? null);
  for (const m of shippedSet().marks) {
    marks[m.id] = {
      file: fileFor(m),
      silhouette: m.silhouette,
      state: m.state,
      role: m.role,
      tone: m.tone,
      motion: m.motion,
      ...(m.dash ? { dash: m.dash, dashUserUnits: dashInUserUnits(m) } : {}),
      reducedMotion: m.rest,
      minPx: m.id.startsWith("control-") ? CONTROL_FLOOR_PX : LEGIBILITY_FLOOR_PX,
    };
  }
  return {
    $comment: "generated by scripts/gen-activity.mjs - do not hand-edit",
    grid: { viewBox: `0 0 ${VIEW} ${VIEW}`, inkBox: INK_BOX, strokeWidth: STROKE, pathLength: PATH_LENGTH },
    floors: { indicator: LEGIBILITY_FLOOR_PX, control: CONTROL_FLOOR_PX },
    tones: {
      attention: "the surface's needs-you token",
      active: "the surface's working token",
      rest: "the surface's muted foreground",
    },
    motion: {
      march: { keyframes: "kng-activity-march", durationMs: MARCH_MS, timing: "linear", property: "stroke-dashoffset" },
      spin: { keyframes: "kng-activity-spin", durationMs: SPIN_MS, timing: "linear", property: "transform" },
      blink: { keyframes: "kng-activity-blink", durationMs: BLINK_MS, timing: "linear", property: "opacity" },
      default: dominant,
    },
    marks,
  };
}

/** The shipped motion CSS, emitted once so no consumer re-authors a duration. */
export function motionCss() {
  return [
    `@keyframes kng-activity-march { to { stroke-dashoffset: -${PATH_LENGTH}; } }`,
    `@keyframes kng-activity-spin { to { transform: rotate(360deg); } }`,
    // A cursor, not a fade: the ramps are 6% of the period, so the bar is
    // effectively on or off rather than pulsing. Symmetric duty cycle.
    `@keyframes kng-activity-blink { 0%, 44% { opacity: 1; } 50%, 94% { opacity: ${BLINK_REST_OPACITY}; } 100% { opacity: 1; } }`,
    // NO shipped mark marches as of 2.8.0 - the rings rotate and the chip
    // blinks. The primitive stays declared because the draft directions in
    // lib/activity.mjs still render with it on the review sheet, and because a
    // future radially symmetric mark can use it. It is not dead by accident.
    `.kng-march { animation: kng-activity-march ${MARCH_MS}ms linear infinite; }`,
    // Explicit user-unit origin: every mark in this set is centred on 12,12, and
    // a percentage origin on an inner <g> resolves against its own bbox, which
    // for a dashed arc is not the circle's centre.
    //
    // `transform-box: view-box` is the CSS initial value, written out rather
    // than inherited: it is what makes the px origin above resolve in viewBox
    // units, so a UA that resolved it against the element's own fill-box would
    // silently rotate a dashed arc about the wrong centre. This rule is now
    // production motion, not a review artifact, so it does not rely on a default.
    `.kng-spin { animation: kng-activity-spin ${SPIN_MS}ms linear infinite; transform-origin: ${VIEW / 2}px ${VIEW / 2}px; transform-box: view-box; }`,
    `.kng-blink { animation: kng-activity-blink ${BLINK_MS}ms linear infinite; }`,
    // No fill mode: the desktop app's animations-off setting zeroes
    // animation-duration, and a FILLED zero-duration animation snaps to its
    // 100% keyframe instead of resting on the canonical frame.
    `@media (prefers-reduced-motion: reduce) {`,
    `  .kng-march, .kng-spin, .kng-blink { animation: none; }`,
    // Per-mark rest rendering: a drop-dash mark clears its dash entirely, so a
    // stopped 65/35 ring is a solid ring rather than one with a hole in it.
    // A keep-dash mark holds its dash: a stopped short arc still reads correctly.
    `  svg[data-rest="${REST_DROP}"] * { stroke-dasharray: none; }`,
    `}`,
  ].join("\n");
}
