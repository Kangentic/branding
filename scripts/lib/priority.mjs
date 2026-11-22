// lib/priority.mjs - THE priority meter: equal bars, one per level above the
// scale's bottom entry, lit up to a task's level. The desktop app, its web demo
// and kangentic-mobile all draw it from here. Every generator imports from this
// file; no other file may re-declare these constants (the mark.mjs / sprite.mjs /
// activity.mjs / pointer.mjs precedent).
//
// This is the repo's SIXTH visual vocabulary, and the first one whose shape is
// not fixed. Its bar count follows the project's priority scale, which a user can
// rename and extend, so what ships is a RULE plus its numbers (meter.json), with
// reference SVGs for the default scale beside it. It is drawn in LAYOUT pixels
// (CSS px on the desktop and the web, dp on the phone), not on the 24 grid: it is
// sized to a line of text, not to an icon slot. It carries no color of its own:
// the consumer tints it with the level's color through currentColor.
//
// ---------------------------------------------------------------------------
// PROVENANCE
//
// The look is kangentic #1160's Design canvas, signed off 2026-11-22 with picks
// 1A, 2B, 3B and 4B (https://claude.ai/artifact/9AkPWbPpc5f5iVbWYukAg3):
//   1A  the title row reads title, #N, meter, globe; the globe keeps the corner.
//   2B  a card with no priority draws nothing and keeps no empty slot.
//   3B  four equal bars, 10px tall and 18px wide, the level shown by how many
//       are lit.
//   4B  that meter replaces the rising one everywhere it drew.
// The numbers below are the ones the 1160 worktree's PriorityMeter.tsx declares,
// and the bar rules are its priorityMeterBars(), so a consumer importing this
// file's manifest draws exactly what was signed off.
//
// The contract is this package's own Design round (branding #24), signed off
// the same day with 1B, 2A, 3 as drawn, 4A and 5B
// (https://claude.ai/artifact/W55nZBExSYFcLmYoHbfRQN). It rendered the meter on
// every ground and scale the canvas did not show, and it added two rules the
// canvas had no reason to draw: bars snap to whole device pixels (1B) and a
// scale stops at seven levels (5B). DECISIONS below records every pick and every
// rejected direction with its reason; .claude/rules/priority-meter-geometry.md
// is the binding copy.
// ---------------------------------------------------------------------------

// Every derived number is rounded here so float error never reaches the
// shipped files (determinism + clean diffs), per lib/mark.mjs.
const n = (v) => +v.toFixed(4);

// ---------------------------------------------------------------------------
// The drawing. Layout pixels at 1x.
// ---------------------------------------------------------------------------

export const BAR_W = 3;
export const BAR_GAP = 2;
// The capital height of the card title's 14px text, which is what centers the
// meter on the title row (3B). The desktop title is text-sm (14px / 20px line)
// font-medium in the system face; the phone's is bodyStrong (14 / 20, 600).
// Measured 2026-11-22 in Chromium on Windows (system-ui, Segoe UI): baseline 15,
// capital height 10, so the cap band is 5..15 on the 20px row, exactly where a
// centered 10px meter sits. From their font metrics, SF Pro's cap band centers
// 0.04px low and Roboto's 0.19px high, both under a pixel.
export const BAR_H = 10;
export const BAR_R = 1;

// A bar above the level, and every bar of the bottom entry (None).
export const UNLIT_OPACITY = 0.3;
export const NONE_OPACITY = 0.45;

// The default scale's length (None, Low, Medium, High, Urgent): the reference
// SVGs are drawn for it. The labels and colors are the desktop's data
// (DEFAULT_PRIORITY_CONFIG in kangentic's src/shared/types.ts), not the brand's,
// so they do not ship here; the review sheet restates them as review data.
export const DEFAULT_LEVEL_COUNT = 5;

// The longest scale a consumer lets a user build (5B): seven levels, six bars,
// 28px. A consumer that adds levels stops here; in kangentic that is the
// Priorities popover's Add Priority, a follow-up not yet built as of 2026-11-22.
// A project that already has more keeps them, and the meter still draws them by
// the rules below; the cap stops the scale growing, it does not truncate it.
export const MAX_LEVELS = 7;

// ---------------------------------------------------------------------------
// The rules. Mirrors kangentic #1160's priorityMeterBars() / priorityMeterWidth().
// ---------------------------------------------------------------------------

/** One bar per level above the bottom entry; a one-entry scale still draws one. */
export const barCount = (levelCount) => Math.max(1, levelCount - 1);

/** Bars lit from the left. A level past the end of the scale lights every bar. */
export const litCount = (level, levelCount) => Math.max(0, Math.min(level, barCount(levelCount)));

/** The meter's width in layout px, at 1x. */
export const meterWidth = (levelCount) => {
  const c = barCount(levelCount);
  return c * BAR_W + (c - 1) * BAR_GAP;
};

/** Each bar's x and opacity. Lit bars are 1; the rest are UNLIT, or NONE at level 0. */
export function meterBars(level, levelCount) {
  const lit = litCount(level, levelCount);
  return Array.from({ length: barCount(levelCount) }, (_, i) => ({
    x: i * (BAR_W + BAR_GAP),
    lit: i < lit,
    opacity: i < lit ? 1 : level > 0 ? UNLIT_OPACITY : NONE_OPACITY,
  }));
}

// ---------------------------------------------------------------------------
// Device pixels (1B). A span's background and a View's frame have every edge
// rounded to a device pixel, so bars drawn at 3 layout px come out unequal at
// any scale where 3 x dpr is not whole. Measured in Chromium 2026-11-22 on a
// real title row (title, #N, then the span meter), CSS zoom standing in for the
// scale: 4 4 4 3 at 125%, 4 5 4 5 at 150%, 6 5 5 5 at 175%. Which bar comes out
// wide follows where the meter starts on the row. The phone's 2.75x and 3.5x do
// the same, modeled from Yoga's edge rounding rather than measured.
//
// So the bar width, the gap and the height are each rounded ONCE to whole device
// px, half up, and every bar uses those values: the same capture painted 4 4 4 4,
// 5 5 5 5 and 5 5 5 5. Half up is stated, not left to a platform's round(),
// because 1.5x bar width (4.5) and 1.25x gap (2.5) are exact ties. JavaScript's
// Math.round and React Native's PixelRatio.roundToNearestPixel both round a
// positive tie up, so both match. The corner radius is not snapped: a 1px
// corner antialiases at any scale. The meter's width moves with the scale (20
// layout px at 1.25x, 19.33 at 1.5x, against 18), which is the accepted cost.
// ---------------------------------------------------------------------------

/** Round half up to a whole device pixel. */
const toDevice = (layoutPx, dpr) => Math.floor(layoutPx * dpr + 0.5);

/** The bar, gap and height at a devicePixelRatio: whole device px, and the layout px a consumer sets. */
export function pixelSnap(dpr) {
  const device = { width: toDevice(BAR_W, dpr), gap: toDevice(BAR_GAP, dpr), height: toDevice(BAR_H, dpr) };
  return {
    dpr,
    device,
    layout: { width: n(device.width / dpr), gap: n(device.gap / dpr), height: n(device.height / dpr) },
  };
}

// The scales the manifest's worked table covers: 1x and 2x and 3x, Windows'
// 125/150/175%, and the common Android densities.
export const SNAP_EXAMPLE_DPRS = [1, 1.25, 1.5, 1.75, 2, 2.625, 2.75, 3, 3.5];

/** Each bar's width in device px under PLAIN layout snapping (1A, rejected): what the measurement above found. */
export const snappedBarWidths = (levelCount, dpr) =>
  meterBars(0, levelCount).map((b) => Math.round((b.x + BAR_W) * dpr) - Math.round(b.x * dpr));

// ---------------------------------------------------------------------------
// Superseded: the rising meter, retired 2026-11-22 by kangentic #1160 (3B, 4B).
// Recorded so the review's BEFORE column is drawn from data and the decision can
// be traced. Bars rose from 5px to 14px, bottom-aligned in a 14px box. Retired
// because its lit bars sat low on Low and Medium, so the meter's ink did not
// share a center with #N and the globe in a card's title row; equal bars give
// the meter one outline at every level.
// ---------------------------------------------------------------------------

export const RISING = { shortest: 5, tallest: 14, retired: "2026-11-22", by: "kangentic #1160 (3B, 4B)" };

export function risingBars(level, levelCount) {
  const c = barCount(levelCount);
  const rise = RISING.tallest - RISING.shortest;
  return meterBars(level, levelCount).map((b, i) => ({
    ...b,
    h: RISING.shortest + Math.round((i * rise) / Math.max(1, c - 1)),
  }));
}

// ---------------------------------------------------------------------------
// THE DECISION RECORD (branding #24, signed off 2026-11-22). Every question the
// Design round put, the pick, and each rejected direction with its reason. A
// rejected direction stays here with its reason rather than being deleted (the
// activity set's rule). The review page renders its signed-off banner from this
// array; the manifest does not read it.
// ---------------------------------------------------------------------------

export const DPR_CANDIDATES = [
  {
    id: "layout",
    retired: "2026-11-22",
    idea: "Layout pixels, as #1160 drew them",
    note: "Bars are 3, gaps 2, height 10 in CSS px or dp, and the renderer rounds every edge. Equal at 1x, 2x and 3x; one device px apart at 1.25x, 1.5x, 1.75x, 2.75x and 3.5x.",
  },
  {
    id: "device",
    selected: "2026-11-22",
    idea: "Whole device pixels",
    note: "Bar, gap and height are each rounded ONCE to whole device px, half up, then every bar uses them. Equal at every scale. The meter's layout width moves by up to 2px with the scale (20 at 1.25x, 19.33 at 1.5x, against 18).",
  },
];

export const DECISIONS = [
  {
    id: 1,
    question: "How the bars land on device pixels",
    picked: "B",
    pick: "Whole device pixels: pixelSnap(), round half up",
    rejected: [
      {
        id: "A",
        idea: "Layout pixels, as #1160 drew them",
        reason: "Unequal bars at every fractional scale, measured in Chromium (4 4 4 3 at 125%, 4 5 4 5 at 150%, 6 5 5 5 at 175%), which defeats 3B's equal bars on the usual Windows laptop settings.",
      },
    ],
  },
  {
    id: 2,
    question: "Where the phone puts the meter",
    picked: "A",
    pick: "The title row, after #N and before the PR glyph: the desktop's order (1A)",
    rejected: [
      {
        id: "B",
        idea: "Leading the labels row, where the flag pill was",
        reason: "A card with no labels would still need the row, which #1146 removed on the desktop, and it breaks parity with the desktop's title row.",
      },
    ],
  },
  {
    id: 3,
    question: "The contract's shape",
    picked: "as drawn",
    pick: "meter.json (numbers, rules, pixelSnap, maxLevels, worked examples) plus meter-0.svg to meter-4.svg for the default scale",
    rejected: [],
  },
  {
    id: 4,
    question: "Who picks the color",
    picked: "A",
    pick: "The level's own color, as the user picks it, through currentColor",
    rejected: [
      {
        id: "B",
        idea: "One fixed tone for every level",
        reason: "An Urgent card stops standing out from a Low one except by two bars, and it is a kangentic change (the picker goes, PriorityBadge stops reading entry.color) plus a phone change if the protocol drops the colors.",
      },
      {
        id: "ramp",
        idea: "A fixed per-level color ramp owned by this package (not drawn)",
        reason: "This package ships no color, only currentColor geometry, because the desktop, the phone and the website each tune color to their own grounds (design-language).",
      },
    ],
  },
  {
    id: 5,
    question: "How long a scale can get",
    picked: "B",
    pick: `A cap of ${MAX_LEVELS} levels (MAX_LEVELS), stated in meter.json for kangentic's Priorities popover to enforce (a follow-up there)`,
    rejected: [
      {
        id: "A",
        idea: "No cap",
        reason: "The meter grows 5px per level; a 15-level scale draws a 68px meter, which crowds the title of a 224px card.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The shipped files.
// ---------------------------------------------------------------------------

export const MANIFEST_FILE = "meter.json";
export const meterFile = (level) => `meter-${level}.svg`;
export const SHIPPED_FILES = [
  ...Array.from({ length: DEFAULT_LEVEL_COUNT }, (_, level) => meterFile(level)),
  MANIFEST_FILE,
];

/**
 * The SHIPPED reference meter: meter.json's bars drawn literally. currentColor,
 * every coordinate an integer, one <rect> per bar, unlit bars carrying their
 * fill-opacity. Drawn at 1x; a consumer drawing at another scale sizes its bars
 * with pixelSnap(). A reference, not what the phone renders: its activity
 * renderer strokes an attribute-less rect as an outline and reads no
 * fill-opacity, so the phone draws Views from meter.json instead.
 */
export function meterSvg(level, levelCount = DEFAULT_LEVEL_COUNT) {
  const w = meterWidth(levelCount);
  const rects = meterBars(level, levelCount).map(
    (b) =>
      `<rect x="${b.x}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_R}"${b.lit ? "" : ` fill-opacity="${b.opacity}"`}/>`,
  );
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${BAR_H}" width="${w}" height="${BAR_H}"`,
    ` fill="currentColor" data-priority-level="${level}" aria-hidden="true">`,
    ...rects,
    `</svg>`,
  ].join("");
}

// ---------------------------------------------------------------------------
// A RASTER source for the review sheets: explicit hex (never rasterize the
// currentColor master; librsvg has no cascade to resolve it), drawn in DEVICE
// pixels at a devicePixelRatio, with the bar edges placed the way a renderer
// places them:
//   snap "device" - pixelSnap(): what ships (1B).
//   snap "layout" - each box edge rounded to a device pixel. What Chromium does
//                   to a span's background and Yoga does to a View's frame when
//                   the bars are sized in plain layout px (1A, rejected).
//   snap "none"   - fractional device coordinates, antialiased. What the
//                   reference SVG does as an <img> or inline at a fractional dpr.
// The corner radius is drawn at dpr px every way; it antialiases in all three.
// ---------------------------------------------------------------------------

export function meterRasterSvg({
  level,
  levelCount = DEFAULT_LEVEL_COUNT,
  color,
  dpr = 1,
  snap = "device",
  rising = false,
  boxH = null,
}) {
  const bars = rising ? risingBars(level, levelCount) : meterBars(level, levelCount);
  const hCss = rising ? RISING.tallest : BAR_H;
  const outerH = boxH ?? hCss;
  const H = Math.ceil(outerH * dpr);
  const top = (outerH - hCss) / 2;
  if (snap === "device" && !rising) {
    const d = pixelSnap(dpr).device;
    const W = bars.length * d.width + (bars.length - 1) * d.gap;
    const y = Math.round((H - d.height) / 2);
    const rects = bars.map(
      (b, i) =>
        `<rect x="${i * (d.width + d.gap)}" y="${y}" width="${d.width}" height="${d.height}" rx="${n(BAR_R * dpr)}" fill="${color}" fill-opacity="${b.opacity}"/>`,
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${rects.join("")}</svg>`;
  }
  const edge = snap === "none" ? (v) => n(v * dpr) : (v) => Math.round(v * dpr);
  const W = Math.ceil(meterWidth(levelCount) * dpr);
  const rects = bars.map((b) => {
    const bh = rising ? b.h : BAR_H;
    const y0 = top + (rising ? hCss - bh : 0);
    const x0 = edge(b.x);
    const x1 = edge(b.x + BAR_W);
    const yy0 = edge(y0);
    const yy1 = edge(y0 + bh);
    return `<rect x="${x0}" y="${yy0}" width="${n(x1 - x0)}" height="${n(yy1 - yy0)}" rx="${n(BAR_R * dpr)}" fill="${color}" fill-opacity="${b.opacity}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${rects.join("")}</svg>`;
}

// ---------------------------------------------------------------------------
// The manifest. Framework-agnostic data: the numbers, the rules as expressions,
// and worked tables a consumer's unit tests can assert against, so a consumer
// that re-implements the rules can prove it implemented these ones.
// ---------------------------------------------------------------------------

const EXAMPLE_SCALES = [1, 2, 3, 5, MAX_LEVELS];

export function manifest() {
  const examples = [];
  for (const levelCount of EXAMPLE_SCALES) {
    for (const level of [0, 1, Math.max(1, levelCount - 1), levelCount + 1]) {
      if (examples.some((e) => e.levelCount === levelCount && e.level === level)) continue;
      examples.push({
        levelCount,
        level,
        width: meterWidth(levelCount),
        lit: litCount(level, levelCount),
        opacities: meterBars(level, levelCount).map((b) => b.opacity),
      });
    }
  }
  return {
    $comment: "generated by scripts/gen-priority.mjs - do not hand-edit",
    units: "layout px at 1x: CSS px on the desktop and the web, dp on the phone. At any other scale, size the bars with pixelSnap",
    color: "currentColor - the level's own color from the project's scale, as its user picked it. A level past the end of the scale has no entry; the consumer draws it in its fallback gray",
    bar: { width: BAR_W, height: BAR_H, gap: BAR_GAP, radius: BAR_R },
    opacity: { lit: 1, unlit: UNLIT_OPACITY, none: NONE_OPACITY },
    rules: {
      barCount: "max(1, levelCount - 1)",
      lit: "min(max(level, 0), barCount), counted from the left",
      opacity: `lit bars 1; every other bar ${UNLIT_OPACITY} when level > 0, ${NONE_OPACITY} when level is 0`,
      width: `barCount * ${BAR_W} + (barCount - 1) * ${BAR_GAP}, at 1x`,
      height: BAR_H,
    },
    pixelSnap: {
      rule: "for each of bar.width, bar.gap and bar.height: device = floor(value * devicePixelRatio + 0.5); draw it at device / devicePixelRatio layout px. Every bar uses the same three values",
      roundHalf: "up",
      radius: "bar.radius is not snapped",
      why: "a renderer rounds each edge to a device pixel, so bars sized in plain layout px come out one device px apart at 1.25x, 1.5x and 1.75x (measured in Chromium: 4 4 4 3, 4 5 4 5, 6 5 5 5). Snapped once, they are equal at every scale",
      reactNative: "PixelRatio.roundToNearestPixel(value) is this rule",
      examplesNote: "layout values below are rounded to 4 decimals for reading; a consumer computes device / devicePixelRatio itself",
      examples: SNAP_EXAMPLE_DPRS.map((dpr) => pixelSnap(dpr)),
    },
    maxLevels: MAX_LEVELS,
    maxLevelsNote: `A consumer that lets a user add levels stops at ${MAX_LEVELS}. A scale that is already longer still draws by the rules`,
    alignment: `centered on its row. ${BAR_H} is the capital height of the 14px title beside it`,
    placement:
      "On a card, the title row: title, #N, the meter, then the corner glyph (the desktop's globe, the phone's PR glyph). A card with no priority keeps no slot for it",
    levelZero:
      "A card draws nothing at level 0. A list or picker that names every level (the Backlog pill, the Priorities popover, an automation's Priority condition) draws level 0 as every bar at opacity.none",
    accessibility: "decorative: the element around the meter carries the level's name (\"Priority: High\")",
    reference: {
      levelCount: DEFAULT_LEVEL_COUNT,
      scale: "None, Low, Medium, High, Urgent (the desktop's default)",
      files: Object.fromEntries(Array.from({ length: DEFAULT_LEVEL_COUNT }, (_, level) => [level, meterFile(level)])),
    },
    examples,
  };
}
