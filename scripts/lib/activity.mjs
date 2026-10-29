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
// and promoted, and eleven marks live in assets/activity/ today (nine until
// agent-question and agent-approval joined on 2026-10-29). The `draft: true`
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

// ---------------------------------------------------------------------------
// agent-question, for GitHub #452. SELECTED 2026-10-29 at maintainer
// sign-off: `bubble-open`, an empty speech bubble, as drawn. The section is
// still called "the question mark" because the round started there. The
// maintainer chose arrangement A (the bubble asks, the envelope keeps the
// finished turn; see round 3 below), then judged the pair, and later the trio
// with agent-approval, in context before the bubble was promoted.
//
// Corrected 2026-10-29. An earlier edit of this header recorded bubble-open as
// SELECTED, reading a stated preference as sign-off. The maintainer had not
// signed off, and had asked to compare the inverse arrangement first.
//
// The desktop app and the phone paint `agent-idle` for two states that need to
// look different: an agent whose turn FINISHED, and an agent BLOCKED ON YOU (a
// pick-an-option prompt, or a tool approval). `agent-question` is the second.
// Both take the attention tone, so in one amber at 16px SHAPE is the only
// channel between them. Every candidate below is judged on that first.
//
// Round 1: four directions, one idea each. The circle and the square were asked
// for by name; the bubble and the bare glyph are proposals.
//
// Round 2, opened the same day on the maintainer's finding from the round-1
// page: a "?" INSIDE a frame does not survive the sidebar. On the zoom sheet the
// framed glyph is about 5 device px tall at 12px with a 1px stroke, and reads as
// a blob, which leaves the circle and the square distinguishable from their
// neighbours by nothing at all. What survives that size is SILHOUETTE and FILL,
// which d4b's record already measured ("present versus absent survives any
// size"). So round 2 drops the "?" and carries the state in the outline alone.
//
// Arrangement A, the round-2 lead: the bubble asks, the envelope keeps the
// finished turn. The bubble is the one silhouette in the field that is both
// legible at the 12px sidebar size (the tail is a feature no other mark has,
// so nothing depends on an interior) and in the same stroked vocabulary and
// weight as the rest of the set. Its case for the envelope staying put: both
// are messages, a delivered one and a conversation waiting on your reply.
//
// Round 3, arrangement B, opened at the maintainer's request the same day: the
// ENVELOPE asks, and a new mark ends the turn. The argument for it is the
// maintainer's, and it is about meaning: mail says "there is a message for
// you", which is what a question IS, and it does not say "the turn ended".
// That is a real counter to the 2026-07-28 record, which chose the envelope for
// "finished, and there is something here for you"; a blocking question is the
// sharper case of "something here for you". TURN_CANDIDATES below are B's
// candidates for the finished turn.
//
// Either way, `agent-idle`'s manifest `role` stops reading "needs you", which
// would describe both marks.
//
// A WON, chosen by the maintainer 2026-10-29 from the round-3 page, with the
// mapping argued like this: of all the drawings, the bubble and the envelope
// are the pair that read at both 12px and large AND belong to one family (both
// are messages, so together they say "idle, and waiting on you"). Between the
// two, the bubble carries the reply that a question needs, and the envelope
// keeps a known icon in the app doing what it already does, with the bubble
// added alongside it rather than replacing it.
//
// The "?" itself is one drawing at two sizes: a 3/4 bowl, a curve into a short
// vertical stem, and a dot. The dot is a FILLED rect rounded into a disc, the
// element the stop control's square already ships as, because it is the one
// filled shape every consumer draws the same way. Three other dots were tried
// or ruled out on 2026-10-29:
//   - a zero-length round-capped subpath renders as a dot in some renderers and
//     as nothing in others;
//   - the lib's filled `disc()` reaches the phone as a stroked ring, because
//     kangentic-mobile's renderer honours `fill` on a rect only;
//   - a stroked circle with a radius under the stroke's half-width, which should
//     paint a solid disc, renders with a visible HOLE in librsvg (seen on the
//     first draft render at 120px), so it is not one geometry everywhere either.
// ---------------------------------------------------------------------------

// Where the bowl's arc stops and the neck takes over, in degrees clockwise from
// 3 o'clock. 30 leaves the bowl visibly open on the lower right, which is what
// separates a "?" from a "2" or a reversed "c" at 12px.
export const QMARK_ARC_END_DEG = 30;
// How far the neck's two control points pull, as a fraction of the distance
// they span. 0.5 is a plain S; higher kinks it.
export const QMARK_TENSION = 0.5;

// The two glyph sizes, in viewBox units. `top` is the bowl's top CENTRELINE, so
// the ink starts one unit higher; `dotR` is the painted disc's radius. Framed:
// 11 units of ink (6.5 to 17.5), centred on 12, leaving 1.5 units to the
// envelope box at top and bottom. Bare: the full 18-unit slot, ink 3 to 21.
export const QMARK_FRAMED = { top: 7.5, r: 2.25, neck: 12, stemEnd: 12.75, dotY: 16.25, dotR: 1.25 };
export const QMARK_BARE = { top: 4, r: 4, neck: 13, stemEnd: 15, dotY: 19.5, dotR: 1.5 };

// The speech bubble's body and tail. Body 18 x 15 on the indicator slot, corners
// R_ENVELOPE so it reads as the envelope's sibling, tail a 3 x 3 notch at the
// lower left that brings the ink to y 21. Every extremum is an integer.
export const BUBBLE_BODY = { y0: 3, y1: 18 };
export const BUBBLE_TAIL = { x: 8, w: 3, tip: 21 };
// The bubble's body is centred on 10.5, not 12, so its "?" rides 1.5 higher.
export const QMARK_BUBBLE = { ...QMARK_FRAMED, top: 6, neck: 10.5, stemEnd: 11.25, dotY: 14.75 };

// Round 2's bubble: no interior to make room for, so the body gives a unit back
// to the TAIL, the one feature that separates a bubble from the envelope's box
// once the sizes get small. Tail 3 wide by 4 deep. That proportion is chosen,
// not incidental: the tail's inscribed radius is (3 + 4 - 5) / 2 = 1, exactly
// the stroke's half-width, so a stroked tail is SOLID with no pinhole, which is
// what lets the solid bubble fill its tail without a filled path.
export const BUBBLE_BODY_OPEN = { y0: 3, y1: 17 };
export const BUBBLE_TAIL_OPEN = { x: 8, w: 3, tip: 21 };

// The bell: a dome of radius 6 whose top lands on y 4, flared sides meeting a
// rim that spans the full 3..21 keyline at y 16, and a clapper whose lowest
// point is y 20, so the ink fills the 18 slot exactly.
export const BELL = { rim: 16, domeR: 6, domeY: 10, clapper: { y: 18, r: 2 } };

export const QUESTION_CANDIDATES = [
  {
    id: "circle",
    round: 1,
    draft: true,
    retired: "2026-10-29: ruled out at review after round 1. The \"?\" is its only difference from agent-working's ring, and at the 12px sidebar size a framed \"?\" is about 5 device px tall and blurs",
    frame: "ring",
    glyph: QMARK_FRAMED,
    note: "the ring at r=9 with a \"?\" inside: the shape everyone already reads as a question. It is also agent-working's exact silhouette, closed instead of dashed, and the controls' ring-plus-centred-glyph vocabulary, which retired d4b and d7",
    cost: "no gate change: a circle outline on the 3..21 keyline",
  },
  {
    id: "square",
    round: 1,
    draft: true,
    retired: "2026-10-29: ruled out at review after round 1, for the circle's reason. Its outline is the envelope's own, so once the \"?\" blurs at 12px it is indistinguishable from agent-idle",
    frame: "envelope-box",
    glyph: QMARK_FRAMED,
    note: "the envelope's own 18 x 16 box with a \"?\" where the flap was. A sibling of agent-idle by construction, and different from it by interior alone. A framed glyph is also the terminal chip's vocabulary, which retired d2b",
    cost: "no gate change: the envelope's own rect, y 4 / 20",
  },
  {
    id: "bubble",
    round: 1,
    draft: true,
    retired: "2026-10-29: superseded by bubble-open. Its silhouette was right and its \"?\" was the most cramped of the three framed ones; round 2 kept the outline, dropped the glyph, and gave the space back to the tail",
    frame: "bubble",
    glyph: QMARK_BUBBLE,
    note: "a speech bubble with a \"?\": the agent is asking you something. Same width, corners and family as the envelope (both are messages), and the tail gives it a silhouette no other mark has",
    cost: "gate change: the keyline and lattice checks learn <path> outlines",
  },
  {
    id: "glyph",
    round: 1,
    draft: true,
    retired: "2026-10-29: removed from the options at review by the maintainer, after round 1",
    frame: null,
    glyph: QMARK_BARE,
    note: "the \"?\" alone, filling the slot's height. The most literal reading, and the only candidate that does not fill the 18 width, so promoting it means amending the indicator keyline rule and its gate",
    cost: "rule and gate change: it spans x 8..16, so the indicator keyline needs an exemption",
  },
  {
    id: "bubble-open",
    round: 2,
    selected: "2026-10-29",
    frame: "bubble",
    body: BUBBLE_BODY_OPEN,
    tail: BUBBLE_TAIL_OPEN,
    glyph: null,
    note: "the speech bubble with nothing inside: the outline alone says the agent is talking to you. Nothing to blur at 12px, and the tail is the one feature no other mark has",
    cost: "gate change: the keyline and lattice checks learn <path> outlines",
  },
  {
    id: "bubble-solid",
    round: 2,
    draft: true,
    retired: "2026-10-29: ruled out at review by the maintainer as too loud. The set has no solid symbol of that weight, so it reads as a different family rather than as the heaviest member of this one",
    frame: "bubble",
    body: BUBBLE_BODY_OPEN,
    tail: BUBBLE_TAIL_OPEN,
    glyph: null,
    solid: true,
    note: "the same bubble, filled. Fill is the channel that survives the smallest sizes, and it makes waiting-on-you the heaviest mark in the row, which matches it being the most urgent state. The only solid indicator in the set",
    cost: "gate change as bubble-open. The fill is a rect plus the stroked tail, the vocabulary the stop square already ships on the phone",
  },
  {
    id: "bell",
    round: 2,
    draft: true,
    retired: "2026-10-29: lost to bubble-open at review. Legible at 12px, but mail and a bell are both \"notification\", so which one means finished and which means waiting would have to be learned",
    frame: "bell",
    glyph: null,
    note: "a bell: an attention silhouette unlike anything else in the set. The risk is meaning, not legibility: mail and a bell are both \"notification\", so which one means finished and which means waiting has to be learned",
    cost: "gate change: path outlines, including the dome's arc extremum",
  },
  {
    // A FIT variant of bubble-open, not a new direction. Side by side in the
    // sidebar the round-2 bubble sits HIGH against the envelope: its body is y
    // 3..17 (centre 10) where the envelope's box is y 4..20 (centre 12), so the
    // two tops miss by a unit and the bodies by two. This moves the body down
    // to the envelope's top, y 4..18, and keeps the ink ending at y 21, which
    // shortens the tail from 4 deep to 3. Still on the integer lattice.
    id: "bubble-level",
    round: 3,
    draft: true,
    retired: "2026-10-29: the maintainer kept the bubble as drawn, narrowing the final review to the three idle marks without this variant",
    frame: "bubble",
    body: { y0: 4, y1: 18 },
    tail: { x: 8, w: 3, tip: 21 },
    glyph: null,
    note: "bubble-open with its body lowered to the envelope's top line, so the pair sits level in a row; the tail is a unit shorter",
    cost: "none beyond bubble-open's",
  },
];
// Promotion is setting this and deleting the candidate's `draft` flag, the way
// ENVELOPE_DEFAULT works. Every other candidate keeps its dated reason. Points
// at arrangement A's bubble while the arrangements are compared; nothing is
// promoted yet, which is why bubble-open still carries `draft`.
export const QUESTION_DEFAULT = "bubble-open";

// Round 3: arrangement B's candidates for the FINISHED TURN, the mark agent-idle
// would become if the envelope moved to the question. Each is one idea, carried
// by outline alone for the reason round 2 established, in the set's stroked
// weight (the solid bubble's rejection rules out fill). Considered and not drawn:
//   - an inbox tray: a second mail metaphor beside the envelope;
//   - a crescent moon: its horns cannot reach x 21, so it cannot sit on the
//     indicator keyline without an exemption;
//   - pause bars or a stop square: the control marks' own glyphs.
export const TURN_CHECK_D = "M3 13 L9 19 L21 7";
export const TURN_FLAG_D = "M3 21 V3 H21 L17 8 L21 13 H3";
export const TURN_CANDIDATES = [
  {
    id: "check",
    draft: true,
    retired: "2026-10-29: arrangement B lost to A at review. The maintainer kept the envelope on the finished turn, a known icon doing what it already does, and added the bubble for the question",
    note: "a check: the turn is done. The plainest \"finished\" there is; the risk is that it reads as the TASK being done, when only the turn is",
    cost: "an M/L path outline, which the gate already bounds",
  },
  {
    id: "ring-closed",
    draft: true,
    retired: "2026-10-29: arrangement B lost to A at review. The maintainer kept the envelope on the finished turn, a known icon doing what it already does, and added the bubble for the question",
    note: "the working ring, closed and still: the spinner stopped. The smallest possible state change, working to finished is the dash closing. d4a drew this for the old needs-you meaning and lost on meaning; a finished turn asks less of it",
    cost: "no gate change: agent-working's own circle",
  },
  {
    id: "flag",
    draft: true,
    retired: "2026-10-29: arrangement B lost to A at review. The maintainer kept the envelope on the finished turn, a known icon doing what it already does, and added the bubble for the question",
    note: "a pennant: a finish line or a milestone reached. The risk is that a flag also means \"flagged for your attention\", which is the question's meaning",
    cost: "an M/V/H/L path outline, which the gate already bounds",
  },
];

/** A "?" as path data plus its dot, centred on the grid's vertical axis. */
const qmarkParts = (g) => {
  const cx = VIEW / 2;
  const cy = g.top + g.r;
  const a = (QMARK_ARC_END_DEG * Math.PI) / 180;
  const ex = cx + g.r * Math.cos(a);
  const ey = cy + g.r * Math.sin(a);
  // Leave the arc along its own tangent, arrive at the neck travelling straight
  // down, so the curve has no corner at either end.
  const k1 = QMARK_TENSION * Math.hypot(ex - cx, g.neck - ey);
  const k2 = QMARK_TENSION * (g.neck - ey);
  const hook =
    `M${n(cx - g.r)} ${n(cy)} A${n(g.r)} ${n(g.r)} 0 1 1 ${n(ex)} ${n(ey)}` +
    ` C${n(ex - k1 * Math.sin(a))} ${n(ey + k1 * Math.cos(a))} ${n(cx)} ${n(g.neck - k2)} ${n(cx)} ${n(g.neck)}` +
    (g.stemEnd > g.neck ? ` V${n(g.stemEnd)}` : "");
  return { hook: path(hook), dot: solidRect(cx - g.dotR, g.dotY - g.dotR, 2 * g.dotR, 2 * g.dotR, g.dotR) };
};

const bubbleD = (body = BUBBLE_BODY, t = BUBBLE_TAIL) => {
  const r = R_ENVELOPE;
  const { y0, y1 } = body;
  return (
    `M${INK_MIN + r} ${y0} H${INK_MAX - r} A${r} ${r} 0 0 1 ${INK_MAX} ${y0 + r} V${y1 - r}` +
    ` A${r} ${r} 0 0 1 ${INK_MAX - r} ${y1} H${t.x + t.w} L${t.x} ${t.tip} V${y1} H${INK_MIN + r}` +
    ` A${r} ${r} 0 0 1 ${INK_MIN} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 1 ${INK_MIN + r} ${y0} Z`
  );
};

/**
 * A question candidate as { outline, interior }. Static, so no perimeter: a
 * mark without a dash never reaches dashInUserUnits.
 *
 * The bare glyph has no closed outline, so its HOOK stands in as `outline`.
 * That is what the gate's keyline and lattice checks read, and they would
 * reject it, which is the honest consequence of that direction.
 */
export const question = (id = QUESTION_DEFAULT) => {
  const c = QUESTION_CANDIDATES.find((q) => q.id === id);
  if (!c) throw new Error(`no question candidate "${id}"`);
  const q = c.glyph ? qmarkParts(c.glyph) : { hook: "", dot: "" };
  if (c.frame === "ring") return { outline: circle(CX, CX, RING_R), interior: q.hook + q.dot, perimeter: null };
  if (c.frame === "envelope-box") {
    const b = envelopeBox(ENVELOPE_DEFAULT);
    return { outline: rect(b.x0, b.y0, b.w, b.h, R_ENVELOPE), interior: q.hook + q.dot, perimeter: null };
  }
  if (c.frame === "bubble") {
    const body = c.body ?? BUBBLE_BODY;
    // Solid: a filled rect under the body's stroke, plus a stroke across the
    // tail's MOUTH. The outline leaves the mouth open (that is what makes it a
    // bubble rather than a box with a triangle under it), so without this the
    // tail is stroked on two sides only and the first solid render showed a
    // dark wedge in it. Stroked on all three, BUBBLE_TAIL_OPEN's inscribed
    // radius of 1 makes it solid.
    const t = c.tail ?? BUBBLE_TAIL;
    const fill = c.solid
      ? solidRect(INK_MIN, body.y0, INK_BOX, body.y1 - body.y0, R_ENVELOPE) + path(`M${t.x} ${body.y1} H${t.x + t.w}`)
      : "";
    return { outline: path(bubbleD(body, t)), interior: fill + q.hook + q.dot, perimeter: null };
  }
  if (c.frame === "bell") {
    const { rim, domeR, domeY, clapper } = BELL;
    const l = CX - domeR;
    const r = CX + domeR;
    // The flare leaves the dome travelling straight down and meets the rim
    // travelling outward, so neither join kinks.
    const d =
      `M${INK_MIN} ${rim} C${l - 1} ${rim - 1.5} ${l} ${n(rim - 3.5)} ${l} ${domeY}` +
      ` A${domeR} ${domeR} 0 0 1 ${r} ${domeY} C${r} ${n(rim - 3.5)} ${r + 1} ${rim - 1.5} ${INK_MAX} ${rim} Z`;
    const k = clapper;
    return {
      outline: path(d),
      interior: path(`M${CX - k.r} ${k.y} A${k.r} ${k.r} 0 0 0 ${CX + k.r} ${k.y}`),
      perimeter: null,
    };
  }
  return { outline: q.hook, interior: q.dot, perimeter: null };
};

/** One of arrangement B's finished-turn candidates as { outline, interior }. */
export const turnEnd = (id) => {
  if (id === "ring-closed") return { outline: circle(CX, CX, RING_R), interior: "", perimeter: null };
  if (id === "check") return { outline: path(TURN_CHECK_D), interior: "", perimeter: null };
  if (id === "flag") return { outline: path(TURN_FLAG_D), interior: "", perimeter: null };
  throw new Error(`no turn-end candidate "${id}"`);
};

// ---------------------------------------------------------------------------
// Round 4, 2026-10-29: agent-approval. SELECTED 2026-10-29 at maintainer
// sign-off: `shield-crest-tall`, the crested shield at 18 x 20 (round 5).
//
// What decided it, from the round-5 page: of the three proportions, the tall
// one carries lucide's definition best, with longer straight sides and the
// sharpest point, and it reads as a shield at 12px. It keeps the 18 width that
// aligns the row; its height overshoots the 18 slot by a unit at the peak and
// at the point (y 2 to 22), the correction a typeface makes for a pointed
// letter, so the point does not read short beside the square marks. The gate
// checks width and the pixel lattice, not height, and both pass.
//
// Requested by the desktop task for #452 (Kangentic #920), with the
// maintainer's go-ahead, after the notification design split the idle agent
// three ways: "has a question" (a pick-an-option tool is waiting), "needs your
// approval" (a tool approval prompt, or a plan waiting to be approved), and
// "went idle" (the turn finished, nothing pending). The envelope keeps the
// last, the bubble narrows to the first, and this mark is the second.
//
// Consumers, as the request described them: an unreported wait shows the
// bubble; the desktop card, its tooltip and the phone card show this mark for
// an approval; and the desktop sidebar and Agent Monitor keep ONE waiting
// count drawn with the bubble. That last part did not survive review (round 6
// below): the counting surfaces keep one idle count drawn with the ENVELOPE,
// covering all three kinds. Either way this mark meets the other two on cards,
// not in the sidebar's counter row.
//
// Same constraints as the bubble, for the reasons rounds 1 and 2 measured:
// the attention amber, static, and no interior glyph, so the SILHOUETTE alone
// tells three amber marks apart at the sidebar's 12px. A check was ruled out
// before drawing, by the requester: it reads as "already approved". Each
// candidate below is one idea.
// ---------------------------------------------------------------------------

// The shield: a flat top with R_ENVELOPE corners, straight sides down to the
// shoulder, then two circular arcs meeting at a point on the slot's floor.
// Each arc leaves the shoulder travelling straight down, so the side has no
// kink; that tangent fixes the radius at (w^2 + d^2) / 2w for half-width w and
// drop d. The shoulder is the one number worth iterating: higher reads as a
// pointed oval, lower as a box with a short point.
export const SHIELD = { top: 3, shoulder: 9, tip: 21 };
// Round 5, the same day, on the maintainer's read of round 4: the plain shield
// "only looks like a shield in shape", and wants detail. Detail is what
// failed round 1, but what failed there was a curved glyph with a dot inside a
// frame; a change to the OUTLINE, or one straight stroke, is a far smaller ask
// of 12px. Two single-idea answers, each on the round-4 shield:
//   - crest: the top rises to a point at the centre instead of running flat,
//     which is the outline most people know as a shield or badge. The detail
//     is in the silhouette, so there is still nothing inside to blur.
//   - half: the shield divided by one vertical stroke from top to tip, the
//     heraldic "party per pale" and the idea behind the shield-half glyph on
//     the phone's permission-request card.
// The phone's own glyph is both at once; that blend is held back until the
// single ideas have been judged, per the maintainer's standing preference.
//
// Then, mid-round, the maintainer pointed at lucide's `shield` as the bar for
// definition. Its definition is four things: a crested top that rises from
// each corner to a peak, small corner radii, STRAIGHT sides, and a curved base
// meeting at a point. Its proportions are read off it here; its path data is
// not copied, per this file's founding rule, and the drawing below is this
// set's own construction in circular arcs, which the gate can bound exactly.
//
// The catch is proportion. lucide's shield is 16 wide and about 20 tall; this
// slot is 18 by 18. A base arc that leaves the shoulder straight down only
// arrives at a POINT when it drops further than the half-width (radius
// (w^2 + d^2) / 2w exceeds w only when d > w); at d = w it lands flat and the
// base is a U. On an 18-square slot that leaves almost no straight side, which
// is a large part of why the round-4 shield read as a generic shape. So the
// crested shield is drawn at three proportions, each a candidate:
//   - 18 x 18: inside the slot and on the keyline, with short sides;
//   - 18 x 20: the same, overshooting the slot a unit at the top and bottom, the
//     way a pointed letterform overshoots the baseline;
//   - 16 x 18: lucide's width, which costs the indicator keyline, though this
//     mark never sits in the sidebar's counter column.
//
// Each crest edge leaves its corner travelling level and rises to the peak on
// a single arc, radius (a^2 + b^2) / 2b for run a and rise b; the two meet at
// the peak at about 98 degrees, close to lucide's, and the round line join
// softens it. Corners are a radius of 1, not R_ENVELOPE: at 2 they eat the
// short crest edge and the top reads as a dome.
export const R_SHIELD = 1;
// The lock: a body on the slot's width, and a shackle arching over it. The
// shackle is the silhouette; no keyhole, per the no-interior rule.
export const LOCK = { body: { y0: 11, y1: 21 }, shackle: { halfW: 4.5, top: 3 } };
// The clipboard: a board on the envelope's footprint with a gap in its top
// edge where the clip tab sits, so no line runs through the tab.
export const CLIPBOARD = { board: { y0: 5, y1: 21 }, tab: { x0: 8, x1: 16, y0: 3, y1: 7, r: 1 } };

export const APPROVAL_CANDIDATES = [
  {
    id: "shield",
    draft: true,
    retired: "2026-10-29: superseded in round 5. At review it read only as a shape, not as a shield; lucide's construction (crested top, straight sides, pointed base) gave the shield its definition",
    note: "a shield: permission, the vocabulary the phone's permission-request card already speaks. Its pointed base is an outline nothing else in the set has, and that point is what has to survive 12px",
    cost: "the gate bounds its arcs from their centre (widened 2026-10-29 for exactly this)",
  },
  {
    id: "shield-crest",
    round: 5,
    draft: true,
    retired: "2026-10-29: the maintainer chose shield-crest-tall. On the 18-square slot the sides are short and the point is soft",
    shield: { crest: { peak: 3, corner: 6 }, x0: 3, x1: 21, shoulder: 10, tip: 21 },
    note: "lucide's shield construction (crested top, straight sides, pointed base) on this slot's 18 x 18. On the keyline and inside the slot, at the price of short sides and a soft point",
    cost: "as the shield: circular arcs, bounded exactly by the gate",
  },
  {
    id: "shield-crest-tall",
    round: 5,
    selected: "2026-10-29",
    shield: { crest: { peak: 2, corner: 5 }, x0: 3, x1: 21, shoulder: 11, tip: 22 },
    note: "the same construction at 18 x 20: a unit of overshoot at the top and the point, the way a pointed letterform overshoots the baseline. Longer sides, a sharper point; it draws a unit taller than its siblings",
    cost: "as the shield. No gate checks height, but the rule's 18 slot would need the overshoot recorded",
  },
  {
    id: "shield-crest-narrow",
    round: 5,
    draft: true,
    retired: "2026-10-29: the maintainer chose shield-crest-tall, which reaches the same definition while keeping the 3..21 keyline this one leaves",
    shield: { crest: { peak: 3, corner: 6 }, x0: 4, x1: 20, shoulder: 12, tip: 21 },
    note: "the same construction at lucide's own 16 width, 16 x 18. The closest to the reference's proportion and the most clearly a shield; the only candidate off the 3..21 keyline",
    cost: "a rule and gate exception: x 4..20 fails the indicator keyline. Defensible because consumers never put this mark in the counter column the keyline exists for",
  },
  {
    id: "shield-half",
    round: 5,
    draft: true,
    retired: "2026-10-29: the maintainer chose shield-crest-tall: the definition went into the outline, so no interior stroke was needed",
    shield: { half: true },
    note: "the shield divided by one vertical stroke, top to tip: the heraldic halved shield, and the idea behind the phone's permission-card glyph. One straight line is the smallest interior there is",
    cost: "as the shield, plus one interior path",
  },
  {
    id: "lock",
    draft: true,
    retired: "2026-10-29: the maintainer chose shield-crest-tall. The shield won on meaning (permission, as on the phone's permission card) and on its unique point",
    note: "a padlock: the agent is held until you grant access. The shackle's arch is the silhouette. The risk is that a lock also reads as \"locked\" or \"private\", a status rather than a request",
    cost: "no gate change: the outline is the body's rect",
  },
  {
    id: "clipboard",
    draft: true,
    retired: "2026-10-29: the maintainer chose shield-crest-tall. Its envelope-sized box put it closest to the mark it most needed to differ from",
    note: "a clipboard: something to review and sign off, which is plan approval most literally. The risk is its footprint: a rounded box the envelope's size, told apart by the clip tab alone",
    cost: "none beyond the bubble's path support",
  },
];

// Promotion is setting this and deleting the candidate's `draft` flag, the way
// QUESTION_DEFAULT and ENVELOPE_DEFAULT work. Every other candidate keeps its
// dated reason.
export const APPROVAL_DEFAULT = "shield-crest-tall";

/** One approval candidate as { outline, interior }. Static, so no perimeter. */
export const approval = (id = APPROVAL_DEFAULT) => {
  const r = R_ENVELOPE;
  const c = APPROVAL_CANDIDATES.find((a) => a.id === id);
  if (id.startsWith("shield") && c) {
    const s = { ...SHIELD, x0: INK_MIN, x1: INK_MAX, ...(c.shield ?? {}) };
    const { x0, x1, shoulder, tip, crest, half = false } = s;
    const w = (x1 - x0) / 2;
    const d = tip - shoulder;
    const R = n((w * w + d * d) / (2 * w));
    // Down the right side, round the base to the point, up to the left
    // shoulder. Shared by both tops.
    const base = `A${R} ${R} 0 0 1 ${CX} ${tip} A${R} ${R} 0 0 1 ${x0} ${shoulder}`;
    let dd;
    let top;
    if (crest) {
      const rc = R_SHIELD;
      const a = CX - x0 - rc;
      const b = crest.corner - crest.peak;
      const Rt = n((a * a + b * b) / (2 * b));
      top = crest.peak;
      // Left corner, then the crest edge leaving it level and rising to the
      // peak (sweep 0 turns it upward), mirrored down to the right corner.
      dd =
        `M${x0} ${crest.corner + rc} A${rc} ${rc} 0 0 1 ${x0 + rc} ${crest.corner} A${Rt} ${Rt} 0 0 0 ${CX} ${crest.peak}` +
        ` A${Rt} ${Rt} 0 0 0 ${x1 - rc} ${crest.corner} A${rc} ${rc} 0 0 1 ${x1} ${crest.corner + rc} V${shoulder} ${base} Z`;
    } else {
      top = s.top;
      dd = `M${x0 + r} ${top} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${top + r} V${shoulder} ${base} V${top + r} A${r} ${r} 0 0 1 ${x0 + r} ${top} Z`;
    }
    return { outline: path(dd), interior: half ? path(`M${CX} ${top} V${tip}`) : "", perimeter: null };
  }
  if (id === "lock") {
    const { body, shackle } = LOCK;
    const x0 = n(CX - shackle.halfW);
    const x1 = n(CX + shackle.halfW);
    const arcY = n(shackle.top + shackle.halfW);
    return {
      outline: rect(INK_MIN, body.y0, INK_BOX, body.y1 - body.y0, r),
      interior: path(`M${x0} ${body.y0} V${arcY} A${shackle.halfW} ${shackle.halfW} 0 0 1 ${x1} ${arcY} V${body.y0}`),
      perimeter: null,
    };
  }
  if (id === "clipboard") {
    const { board, tab } = CLIPBOARD;
    const { y0, y1 } = board;
    const dd =
      `M${tab.x0} ${y0} H${INK_MIN + r} A${r} ${r} 0 0 0 ${INK_MIN} ${y0 + r} V${y1 - r} A${r} ${r} 0 0 0 ${INK_MIN + r} ${y1}` +
      ` H${INK_MAX - r} A${r} ${r} 0 0 0 ${INK_MAX} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 0 ${INK_MAX - r} ${y0} H${tab.x1}`;
    return {
      outline: path(dd),
      interior: rect(tab.x0, tab.y0, tab.x1 - tab.x0, tab.y1 - tab.y0, tab.r).replace(` pathLength="${PATH_LENGTH}"`, ""),
      perimeter: null,
    };
  }
  throw new Error(`no approval candidate "${id}"`);
};

// ---------------------------------------------------------------------------
// Round 6, 2026-10-29: an AGNOSTIC idle mark, for the surfaces that count.
// DECIDED 2026-10-29 at maintainer sign-off: NO NEW MARK. The counting
// surfaces keep drawing their one idle count with the envelope, as they did
// before this release. See the decision note after AGGREGATE_CANDIDATES.
//
// The three idle marks are for surfaces that show ONE agent: a card, its
// tooltip, the phone card, a notification. The desktop sidebar and the Agent
// Monitor COUNT agents, and the maintainer ruled out the two ways of counting
// with them. Splitting into a question count and an approval count does not
// fit the row; and one waiting count drawn with the bubble raises the question
// of why approvals do not get theirs. Today's sidebar already folds every idle
// agent into ONE count, which is the shape that fits; its flaw is that it draws
// that count with the envelope, which now means only "turn finished".
//
// So the counting surfaces want a fourth mark that means "idle, needs you" and
// nothing more specific: questions, approvals and finished turns together,
// beside the working ring. Each candidate is one idea:
// ---------------------------------------------------------------------------

// The inbox tray: an open tray whose walls slope in toward the top, and the
// notch of its floor line. The silhouette is the slope; the notch is the one
// interior line, kept because without it the tray is a trapezoid.
export const INBOX = { top: 5, floor: 13, bottom: 21, inset: 3, notch: { x0: 8, x1: 16, depth: 3 } };
// The amber dot, as a radius in grid units. 4 paints an 8-unit disc, under
// half the slot, the size a status lamp is rather than a mark.
export const DOT_R = 4;

export const AGGREGATE_CANDIDATES = [
  {
    id: "bell",
    draft: true,
    retired: "2026-10-29: the maintainer kept the envelope as the counting mark. Mail already means \"there is something for you\", which is what an idle count says, and it needs no new mark and no consumer change",
    note: "a bell: attention, nothing more specific. It lost round 2 as the QUESTION mark because beside the envelope nobody could tell which meant what; as the count of all three, being generic is the job",
    cost: "a redraw: round 2's flares are cubics, which the gate cannot bound, so they would become arcs",
  },
  {
    id: "inbox",
    draft: true,
    retired: "2026-10-29: ruled out at review in the sidebar replica, where the maintainer kept the envelope, the bell and the ring as the three that work beside the spinner",
    note: "an inbox tray: things waiting for you, whatever they are. The same messages family as the envelope and the bubble, one level up: the tray they arrive in",
    cost: "none beyond the path support: lines and arcs only",
  },
  {
    id: "ring",
    draft: true,
    retired: "2026-10-29: the maintainer kept the envelope as the counting mark. Mail already means \"there is something for you\", which is what an idle count says, and it needs no new mark and no consumer change",
    note: "the working ring, closed and still: the agent stopped and is waiting on you. The ring IS the agent in the sidebar, dashed and spinning while it works, whole and amber when it waits. d4a drew this for the old needs-you meaning and lost on meaning; summarising a count asks less of it",
    cost: "no gate change: agent-working's own circle",
  },
  {
    id: "dot",
    draft: true,
    retired: "2026-10-29: ruled out at review in the sidebar replica, where the maintainer kept the envelope, the bell and the ring as the three that work beside the spinner",
    note: "an amber dot: the plainest lamp, and the same dot the phone already draws below the 12px floor. The set's only filled mark, and the least loud way to be one",
    cost: "a rule and gate exception: an 8-unit disc cannot span the 3..21 keyline, and it is the only filled indicator",
  },
];

// The decision, recorded where the next change will look for it. Three
// options survived the sidebar replica (the envelope, the bell, the closed
// ring), and the maintainer chose the ENVELOPE, so this round ships nothing.
// The envelope is general in a count and specific on a card: in the desktop
// sidebar and Agent Monitor it counts every idle agent, whatever it waits on;
// on a card, a tooltip or the phone, where the bubble and the shield take the
// question and the approval, it means the turn finished. Splitting the count by
// kind was ruled out for width, and a count drawn with the bubble was ruled
// out because it would leave approvals out.

/** One agnostic-idle candidate as { outline, interior }. Static, so no perimeter. */
export const aggregate = (id) => {
  if (id === "bell") return question("bell");
  if (id === "ring") return { outline: circle(CX, CX, RING_R), interior: "", perimeter: null };
  if (id === "dot") return { outline: solidRect(CX - DOT_R, CX - DOT_R, 2 * DOT_R, 2 * DOT_R, DOT_R), interior: "", perimeter: null };
  if (id === "inbox") {
    const { top, floor, bottom, inset, notch } = INBOX;
    const r = R_ENVELOPE;
    const dd =
      `M${INK_MIN} ${floor} V${bottom - r} A${r} ${r} 0 0 0 ${INK_MIN + r} ${bottom} H${INK_MAX - r}` +
      ` A${r} ${r} 0 0 0 ${INK_MAX} ${bottom - r} V${floor} L${INK_MAX - inset} ${top} H${INK_MIN + inset} Z`;
    return {
      outline: path(dd),
      interior: path(`M${INK_MIN} ${floor} H${notch.x0} L${notch.x0 + 1.5} ${floor + notch.depth} H${notch.x1 - 1.5} L${notch.x1} ${floor} H${INK_MAX}`),
      perimeter: null,
    };
  }
  throw new Error(`no aggregate candidate "${id}"`);
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
      // The agent is the one family whose states are different drawings. That is
      // the whole direction: an envelope can be read as "finished, and there is
      // something here for you", a ring as "still running".
      //
      // `role` read "needs you" until 2026-10-29, when agent-question and
      // agent-approval split the blocked-on-you states off this mark. All three
      // are amber and all three need you, so the phrase stopped telling a reader
      // of the manifest which was which. The second half says what only the
      // README said otherwise: a surface that COUNTS agents draws its one idle
      // count with this mark, covering all three kinds (round 6).
      { id: "agent-idle", role: "turn finished; the idle count", silhouette: "envelope", state: "idle", tone: "attention", ...envelope(), motion: null, rest: REST_STATIC },
      // Spins rather than marches, which on a circle is the SAME image (see
      // SPIN_MS) but composited, so the ring keeps turning while a consumer's
      // main thread is blocked. Geometry, dash and period are untouched.
      { id: "agent-working", role: "working", silhouette: "ring", state: "working", tone: "active", ...ring(), motion: "spin", dash: DASH_SPINNER, rest: REST_KEEP },
      // Added 2026-10-29 (GitHub #452): the agent is blocked on a question, a
      // pick-an-option prompt. The same amber as agent-idle, and static like it,
      // so the silhouette alone carries the difference. See QUESTION_CANDIDATES
      // for the rounds that chose the bubble.
      //
      // `role` narrowed from "waiting on your answer" to "has a question" the
      // same day, when agent-approval was requested for approvals; see round 4.
      { id: "agent-question", role: "has a question", silhouette: "bubble", state: "waiting", tone: "attention", ...question(), motion: null, rest: REST_STATIC },
      // Added 2026-10-29 (GitHub #452, requested by Kangentic #920): the agent
      // is blocked on an approval, a tool approval prompt or a plan waiting to
      // be approved. The third amber, static mark, told apart from the bubble
      // and the envelope by its pointed base. A card, tooltip and phone mark:
      // the surfaces that COUNT agents draw one idle count with the envelope
      // instead (round 6). See APPROVAL_CANDIDATES for the rounds that chose it.
      { id: "agent-approval", role: "needs your approval", silhouette: "shield", state: "waiting", tone: "attention", ...approval(), motion: null, rest: REST_STATIC },
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
      // glyph beside its packaged siblings.
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
