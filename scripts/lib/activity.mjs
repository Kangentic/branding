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
// The set is UNDER REVIEW. Candidate directions are declared below, all
// `draft: true`; the maintainer picks one from exploration/activity/compare.html
// and promotion is deleting that flag. Nothing here ships to assets/ until then.

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
    note: "aspect 1.125; the hedge if the full 1.25 reads squat beside the ring",
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
    selected: "2026-07-29",
    note: "aspect 1.25 at the set's 18 width; a uniform 0.9 scale of the reference glyph, so it restores the 120.4 degree angle for free",
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
export const ENVELOPE_DEFAULT = "mail";

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
export const KEYLINES = {
  indicator: { span: [INK_MIN, INK_MAX], note: "14px label in a counter row" },
  control: { span: [(VIEW - 2 * 10) / 2, VIEW - (VIEW - 2 * 10) / 2], note: "20px target in a header" },
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

// M2 "rotation": what ships today. Only coherent on a radially symmetric mark -
// a rotating envelope or a rotating chip is the "tilted" artifact, not motion.
export const SPIN_MS = 1200;

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

export const chip = ({ plus = false } = {}) => ({
  outline: inkBox(R_CHIP),
  interior: plus ? path(PLUS_V_D) + path(PLUS_H_D) : path(PROMPT_D) + path(PROMPT_BAR_D),
  perimeter: rrectPerimeter(INK_BOX, INK_BOX, R_CHIP),
});

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
 * `onGrid` is the question this raises. As shipped the ring is r=10, chosen
 * because lucide's Loader2 at r=9 "rendered ~10% smaller" beside it - but that
 * was a comparison against lucide's own inconsistent grid, which is the problem
 * this set exists to remove. Once every mark fills an 18 ink box, r=9 IS the
 * set's ring, the controls join the family, and the hand-computed 47/16 pair
 * is replaced by the same pathLength-normalized 75/25 every other mark uses.
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
const statePair = (id, role, parts, { dash, rest }) => [
  { id: `${id}-idle`, role: `${role}, idle`, silhouette: id, state: "idle", tone: "attention", ...parts, motion: null, rest: REST_STATIC },
  { id: `${id}-working`, role: `${role}, working`, silhouette: id, state: "working", tone: "active", ...parts, motion: "march", dash, rest },
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
      { id: "agent-working", role: "working", silhouette: "ring", state: "working", tone: "active", ...ring(), motion: "march", dash: DASH_SPINNER, rest: REST_KEEP },
      // Everything else is one silhouette in two states, named explicitly rather
      // than left for a consumer to compose out of a tone and an animation
      // class. Composition is where three surfaces drift apart.
      ...statePair("terminal", "terminal", chip(), { dash: DASH_CHIP, rest: REST_DROP }),
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
      ...statePair("control-pause", "pause button", controlRing("pause"), { dash: DASH_SPINNER, rest: REST_KEEP }),
      ...statePair("control-stop", "stop button", controlRing("stop"), { dash: DASH_SPINNER, rest: REST_KEEP }),
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
  // A drop-dash mark at rest carries no dasharray at all; a keep-dash one holds
  // its dash so the stopped glyph still reads as the mark it is.
  // The dash is what makes EITHER primitive visible: a solid ring rotating
  // shows nothing at all, so spin needs it exactly as much as march does.
  const moving_ = marching || spinning;
  const dash = mark.dash && (moving_ || (resting && mark.rest === REST_KEEP)) ? ` stroke-dasharray="${mark.dash}"` : "";
  const anim = marching ? "kng-march" : spinning ? "kng-spin" : "";
  // Motion rides on the OUTLINE alone, never on the <svg>. Rotating the whole
  // element would turn the centred glyph with it, which is the tilt artifact:
  // the shipped controls put animate-spin on the <Circle> and leave the pause
  // bars and stop square as static siblings. Same structure here.
  const outline = mark.outline.replace("/>", `${dash}/>`);
  const moving = anim ? `<g class="${anim}">${outline}</g>` : outline;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${size}" height="${size}"`,
    ` fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"`,
    cls ? ` class="${cls}"` : "",
    ` data-mark="${mark.id}" data-rest="${mark.rest}" aria-hidden="true">`,
    moving,
    mark.interior,
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
      default: "march",
    },
    marks,
  };
}

/** The shipped motion CSS, emitted once so no consumer re-authors a duration. */
export function motionCss() {
  return [
    `@keyframes kng-activity-march { to { stroke-dashoffset: -${PATH_LENGTH}; } }`,
    `@keyframes kng-activity-spin { to { transform: rotate(360deg); } }`,
    `.kng-march { animation: kng-activity-march ${MARCH_MS}ms linear infinite; }`,
    // Explicit user-unit origin: every mark in this set is centred on 12,12, and
    // a percentage origin on an inner <g> resolves against its own bbox, which
    // for a dashed arc is not the circle's centre.
    `.kng-spin { animation: kng-activity-spin ${SPIN_MS}ms linear infinite; transform-origin: ${VIEW / 2}px ${VIEW / 2}px; }`,
    // No fill mode: the desktop app's animations-off setting zeroes
    // animation-duration, and a FILLED zero-duration animation snaps to its
    // 100% keyframe instead of resting on the canonical frame.
    `@media (prefers-reduced-motion: reduce) {`,
    `  .kng-march, .kng-spin { animation: none; }`,
    // Per-mark rest rendering: a drop-dash mark clears its dash entirely, so a
    // stopped 65/35 ring is a solid ring rather than one with a hole in it.
    // A keep-dash mark holds its dash: a stopped short arc still reads correctly.
    `  svg[data-rest="${REST_DROP}"] * { stroke-dasharray: none; }`,
    `}`,
  ].join("\n");
}
