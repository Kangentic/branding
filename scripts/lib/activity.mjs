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

// The envelope flap, as fractions of the ink box so the V scales with it. The
// flap is the envelope's whole identity at 14px and the only thing separating it
// from the terminal chip once both are 18x18, so its depth is the one number
// worth iterating on rather than asserting. Depth drives the vertex angle: at
// full bleed the half-width is always 9, so angle = 2*atan(9/depth). Deeper
// reads more like mail and more like a downward arrow; shallower reads calmer
// and, past a point, like a lid rather than a flap.
export const FLAP_VARIANTS = [
  { id: "deep", top: 0.222, vertex: 0.611, note: "first draft, rejected as too pointy" },
  { id: "standard", top: 0.1875, vertex: 0.5456, note: "selected 2026-07-28" },
  { id: "mid", top: 0.1875, vertex: 0.5208, note: "" },
  { id: "soft", top: 0.167, vertex: 0.444, note: "" },
  { id: "shallow", top: 0.139, vertex: 0.375, note: "" },
  { id: "lid", top: 0.111, vertex: 0.306, note: "" },
];
// Selected from the contact sheet 2026-07-28 against a target depth of 6 to
// 6.5. The number was arrived at by drafting six angles and looking at them; a
// reference glyph was measured along the way, which is drafting provenance and
// not a dependency. This envelope is the set's own mark - its ink box, corner
// radius, stroke and flap are all declared here and match nothing off the shelf.
export const FLAP_DEFAULT = "standard";

const flapGeom = (id) => {
  const v = FLAP_VARIANTS.find((f) => f.id === id) ?? FLAP_VARIANTS.find((f) => f.id === FLAP_DEFAULT);
  const top = n(INK_MIN + v.top * INK_BOX);
  const vertex = n(INK_MIN + v.vertex * INK_BOX);
  return { ...v, top, vertex, depth: n(vertex - top), angle: n((2 * Math.atan(INK_BOX / 2 / (vertex - top)) * 180) / Math.PI) };
};
export const flapVariant = (id) => flapGeom(id);

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

export const envelope = (variant = FLAP_DEFAULT) => {
  const f = flapVariant(variant);
  return {
    outline: inkBox(R_ENVELOPE),
    interior: flap(f.top, f.vertex),
    perimeter: rrectPerimeter(INK_BOX, INK_BOX, R_ENVELOPE),
  };
};

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
      // The two shipped controls, brought onto the set's grid. They were never
      // candidates - they are the rest of the family, and they belong here for
      // the same reason the indicators do: the 47/16 dash they carry today is a
      // hand-computed pair duplicated across two desktop files that breaks
      // silently if the radius changes. Marching rather than rotating, which on
      // a circle is visually identical to what they already do.
      ...statePair("control-pause", "pause button", controlRing("pause", { onGrid: true }), { dash: DASH_SPINNER, rest: REST_KEEP }),
      ...statePair("control-stop", "stop button", controlRing("stop", { onGrid: true }), { dash: DASH_SPINNER, rest: REST_KEEP }),
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
