// lib/pointer.mjs - THE demo pointer: the dot that stands in for a mouse over a
// scripted demo, and its click. kangentic.com's hero and the app's web demo both
// draw it from here. Every generator imports from this file; no other file may
// re-declare these constants (the mark.mjs / sprite.mjs / activity.mjs
// precedent).
//
// This is the repo's FIFTH visual vocabulary. lib/mark.mjs is knockout-disc brand
// geometry; lib/sprite.mjs is pixel-art rect grids (illustration); lib/activity.mjs
// is status marks on a 24 grid; lib/ui-glyphs.mjs is navigation marks on that
// grid. This is none of those. It is not an icon on a grid but a stand-in for a
// pointer, drawn in PAGE PIXELS, and it is the only set here whose motion is
// event-driven (a press, a release) rather than a loop. It carries no brand color
// of its own: the consumer tints it cream or ink through currentColor.
//
// ---------------------------------------------------------------------------
// WHAT SHIPS HERE, AND WHAT STAYS WITH THE CONSUMERS
//
// Here: the dot's drawing (core and halo), the ring a press leaves, the two
// tones' weights and the rule for picking between them, and the click as data
// (the core's squash, the halo's pop, the ring running out). The consumers keep
// WHERE the pointer goes and WHEN: the hero's eight-second beat, its follow mode
// and its holds stay in kangentic.com's DemoPointer.astro; the demo's travel
// between targets, its drags, how long it holds a press (90ms) and its
// double-click gap (210ms) stay in the app's demo/choreography.ts.
//
// ---------------------------------------------------------------------------
// PROVENANCE
//
// The dot is the hero's, signed off on kangentic.com #135 (2026-11-12, item 9:
// "built once and reused in other scripted demos: cream on dark scenes, ink on
// light"). App #1096 then moved the demo onto it, and its Design canvas was
// signed off on 2026-11-17 with picks 1B, 2B, 3A, 4B, 5A and 6 as drawn. Every
// constant below names the artboard it comes from, so a later change traces a
// number to the sign-off rather than to a consumer's copy of it.
//
// What the sign-off moved, against the hero as it stood:
//   - 2B dropped the 30px aura, the hero's included. At docs-figure scale it
//     covered a filter pill and a half, and breathed there through every pause.
//   - 5A added the HELD press: the core stays squashed through a drag's carry.
//     The hero never drags, so this is new, and the package draws it.
//   - 4B made the tone follow the ground under the dot, not the theme, because a
//     terminal draws a fixed near-black in every theme.
//
// One number was drawn two ways on the canvas, and the maintainer settled it
// (2026-11-17). The halo's pop is 160ms up and 320ms back (D6's hero, `h-pop`,
// and today's DemoPointer.astro). The demo artboards (D3 `bf-po`, D5 `dg-po`)
// drew 120ms up and 200ms back. The spec text, "pops to 1.5 and settles in
// 0.32s", fits either. The hero's was picked, because the spec also says the
// hero is unchanged and the package ships one click for both.
// ---------------------------------------------------------------------------

import { CREAM, INK } from "./mark.mjs";

// Every derived number is rounded here so float error never reaches the
// shipped files (determinism + clean diffs), per lib/mark.mjs.
const n = (v) => +v.toFixed(4);

// ---------------------------------------------------------------------------
// The drawing. Page pixels at host scale 1 (D1 B, see UNITS below).
// ---------------------------------------------------------------------------

// The core: an 8px disc at full tone. R-spec "Core"; every artboard's `.core`.
export const CORE_D = 8;

// The halo: an 18px disc, OUTER diameter, with a 1px edge inside it. This is a
// CSS border-box circle (every artboard sets box-sizing: border-box), so the
// fill reaches the outer edge and the edge paints over it. Two circles
// reproduce that exactly: the fill at the outer radius, the edge stroked on the
// circle half an edge in. R-spec "Halo".
export const HALO_D = 18;
export const HALO_EDGE = 1;

// The ring a press leaves: a 1.5px hairline that runs out to 72px. R-spec
// "Ring"; D6 `h-grow`; D3 A, the hero's ring unchanged.
export const RING_D = 72;
export const RING_STROKE = 1.5;
// It starts at 0.26 of its full size, 18.72px, just outside the halo's 18, so it
// leaves the halo's edge rather than appearing over the core. POINTER asserts
// RING_FROM * RING_D clears HALO_D.
export const RING_FROM = 0.26;

// No aura. D2 B. Recorded as a constant so the absence is a decision a reader
// can find, not a gap: the hero's 30px aura at 12% is what this replaced.
export const AURA = null;

// ---------------------------------------------------------------------------
// The tones. Never a hex in the SVG: currentColor, and the consumer sets it.
// The hexes live here only as data for the manifest, imported from the palette
// rather than restated.
// ---------------------------------------------------------------------------

// Ink reads a touch heavier than cream at the same alpha, so its halo fill runs
// lighter and its edge firmer. R-spec "Halo"; D4 and D6 `.ink .halo`.
export const TONES = {
  cream: { color: CREAM, ground: "dark", haloFill: 0.2, haloEdge: 0.4 },
  ink: { color: INK, ground: "light", haloFill: 0.16, haloEdge: 0.45 },
};
// The SVG's own weights. A consumer drawing ink overrides them in CSS.
export const DEFAULT_TONE = "cream";

// How a consumer that picks its own tone picks it (D4 B; R-spec "Tone"). The
// demo walks from the element under the point to the first opaque background
// and takes cream below this relative luminance, ink at or above it. Measured on
// the canvas: every theme surface reads 0.017 or less (dark) or 0.876 or more
// (light), and a terminal reads #0c0c0c in every theme, so 0.4 sits in a wide
// gap. A change crossfades. The hero's ground is fixed, so it takes the tone its
// host names and never runs this.
export const TONE_RULE = { creamBelowLuminance: 0.4, crossfadeMs: 120 };

// ---------------------------------------------------------------------------
// The click. D6 is the source for every timing here; see PROVENANCE for the pop.
// ---------------------------------------------------------------------------

// The press: the core steps to 0.7, with no tween, and holds there until the
// release. A click's hold is the consumer's (90ms in the demo, about 152ms in the
// hero's beat); a drag holds it through the carry (D5 A). D6 `h-press` is
// step-end, which is why this is a state and not an animation.
export const PRESS_SCALE = 0.7;

// The halo's pop: up to 1.5 in 160ms, back to 1 in 320ms, each leg ease-out
// (a CSS animation-timing-function eases each keyframe segment separately).
// D6 `h-pop`: 17% to 19% to 23% of eight seconds.
export const POP = { peak: 1.5, upMs: 160, settleMs: 320, easing: "ease-out" };

// The ring: out from RING_FROM to full size in 450ms, ease-out, because a ring
// leaves a click at full speed. It fades from 0.85 to nothing in 400ms, linear,
// so it is gone before it stops. D6 `h-grow` (17% to 22.6%) and `h-fade` (17% to
// 22%).
export const RING_GROW = { ms: 450, easing: "ease-out" };
export const RING_FADE = { from: 0.85, ms: 400, easing: "linear" };

// ---------------------------------------------------------------------------
// Derived boxes. Each viewBox is centered on 0,0, the point the pointer marks.
// ---------------------------------------------------------------------------

// The dot's box holds the halo at the PEAK of its pop, not at rest. An inline
// <svg> clips to its viewBox by default, so an 18-unit box would cut the 27px
// popped halo off. Rounded up to a whole even number so the center stays on a
// pixel. overflow="visible" is a second guard, not the first.
export const DOT_BOX = Math.ceil((POP.peak * HALO_D) / 2) * 2;
// The ring's box holds the full ring and the outer half of its stroke.
export const RING_BOX = Math.ceil(RING_D / 2 + RING_STROKE / 2) * 2;

// Each animated part scales about its own center. Declared on the part itself:
// without it, element.animate({ transform: "scale()" }) on an SVG child scales
// about each browser's default origin, which is the svg's corner.
export const PART_ORIGIN = { transformBox: "fill-box", transformOrigin: "center" };
const originStyle = `transform-box:${PART_ORIGIN.transformBox};transform-origin:${PART_ORIGIN.transformOrigin}`;

// ---------------------------------------------------------------------------
// Units. D1 B; R-spec "Size".
//
// The dot is drawn in PAGE pixels everywhere. The site shows the demo's frame at
// 0.45 in docs figures and 0.44 to 0.77 across the tours, and the hero at 1:1, so
// a frame that drew these numbers in its own pixels would shrink the dot to a
// 3.6px core in a docs figure. A frame cannot measure the transform its host
// puts on it, so the host posts its scale s, and the frame divides every length
// below by s. With no message s is 1.
//
// Sizing each svg at box / s carries everything inside its viewBox along. The
// one length that does NOT ride along is the ring's stroke: it is
// non-scaling-stroke (so it stays a hairline while the circle scales), which also
// keeps it out of the viewBox scale, so a consumer sets it to RING_STROKE / s
// itself. Leave that out and a 0.45 docs figure draws a 0.68px ring.
// ---------------------------------------------------------------------------

export const DIVIDE_BY_HOST_SCALE = ["dot.box", "ring.box", "ring.strokeWidth"];

// ---------------------------------------------------------------------------
// The shipped files.
// ---------------------------------------------------------------------------

export const DOT_FILE = "pointer.svg";
export const RING_FILE = "pointer-ring.svg";
export const MANIFEST_FILE = "pointer.json";
export const SHIPPED_FILES = [DOT_FILE, RING_FILE, MANIFEST_FILE];

const fmt = (v) => `${n(v)}`;
const box = (size) => `${fmt(-size / 2)} ${fmt(-size / 2)} ${fmt(size)} ${fmt(size)}`;

/** The dot's parts, without the root. One builder so the shipped SVG and the
 *  raster rebuild cannot draw two different dots. */
function dotParts({ tone = DEFAULT_TONE, style = true } = {}) {
  const t = TONES[tone];
  const s = (extra = "") => (style ? ` style="${originStyle}${extra}"` : "");
  return [
    `<g data-part="halo"${s()}>`,
    `<circle data-part="halo-fill" r="${fmt(HALO_D / 2)}" fill-opacity="${t.haloFill}"/>`,
    `<circle data-part="halo-edge" r="${fmt(HALO_D / 2 - HALO_EDGE / 2)}" fill="none" stroke="currentColor"`,
    ` stroke-width="${HALO_EDGE}" stroke-opacity="${t.haloEdge}"/>`,
    `</g>`,
    `<circle data-part="core" r="${fmt(CORE_D / 2)}"${s()}/>`,
  ].join("");
}

/**
 * The SHIPPED dot: currentColor, cream weights, every part named. A consumer
 * inlines it, sets `color`, and animates the parts by data-part.
 */
export function pointerSvg() {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box(DOT_BOX)}" width="${DOT_BOX}" height="${DOT_BOX}"`,
    ` overflow="visible" fill="currentColor" data-pointer="dot" aria-hidden="true">`,
    dotParts(),
    `</svg>`,
  ].join("");
}

/**
 * The SHIPPED ring: one hairline circle at full size, resting invisible. A
 * consumer clones it per press, runs ringGrow and ringFade on the circle, and
 * removes it after. Scale the CIRCLE, never the svg: non-scaling-stroke only
 * holds the hairline against a transform inside the svg.
 */
export function pointerRingSvg() {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box(RING_BOX)}" width="${RING_BOX}" height="${RING_BOX}"`,
    ` overflow="visible" fill="none" stroke="currentColor" data-pointer="ring" aria-hidden="true">`,
    `<circle data-part="ring" r="${fmt(RING_D / 2)}" stroke-width="${RING_STROKE}" vector-effect="non-scaling-stroke"`,
    ` opacity="0" style="${originStyle}"/>`,
    `</svg>`,
  ].join("");
}

/**
 * A RASTER source: the same geometry with an explicit hex and a frozen moment
 * of the click, for the review sheets. Never rasterize the currentColor master:
 * librsvg has no cascade to resolve currentColor against (the ui-glyphs
 * precedent). The ring is drawn at its diameter rather than scaled, so its
 * stroke stays RING_STROKE without relying on the renderer's vector-effect.
 */
export function pointerRasterSvg({
  color,
  tone = DEFAULT_TONE,
  size = DOT_BOX,
  pressed = false,
  pop = 1,
  ringD = null,
  ringOpacity = 0,
  aura = null,
  dot = true,
} = {}) {
  const t = TONES[tone];
  const view = Math.max(DOT_BOX, ringD ? Math.ceil(ringD / 2 + RING_STROKE) * 2 : 0, aura ? aura.d : 0);
  const parts = [];
  if (aura) parts.push(`<circle r="${fmt(aura.d / 2)}" fill="${color}" fill-opacity="${aura.opacity}"/>`);
  if (dot) {
    parts.push(
      `<g transform="scale(${fmt(pop)})">`,
      `<circle r="${fmt(HALO_D / 2)}" fill="${color}" fill-opacity="${t.haloFill}"/>`,
      `<circle r="${fmt(HALO_D / 2 - HALO_EDGE / 2)}" fill="none" stroke="${color}" stroke-width="${HALO_EDGE}" stroke-opacity="${t.haloEdge}"/>`,
      `</g>`,
      `<circle r="${fmt((CORE_D / 2) * (pressed ? PRESS_SCALE : 1))}" fill="${color}"/>`,
    );
  }
  if (ringD && ringOpacity > 0) {
    parts.push(
      `<circle r="${fmt(ringD / 2)}" fill="none" stroke="${color}" stroke-width="${RING_STROKE}" stroke-opacity="${fmt(ringOpacity)}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box(view)}" width="${fmt((size * view) / DOT_BOX)}" height="${fmt((size * view) / DOT_BOX)}">${parts.join("")}</svg>`;
}

// ---------------------------------------------------------------------------
// The click at a moment, sampled from the same constants the manifest ships.
// The review sheet's filmstrip uses it, so the frames it draws are the data.
// ---------------------------------------------------------------------------

// CSS's `ease-out` is cubic-bezier(0, 0, 0.58, 1). Solved for y at x by bisection,
// which is exact enough for a review frame and has no float-order surprises.
const cubic = (p1, p2) => (t) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
const EASE = {
  "ease-out": (x) => {
    const bx = cubic(0, 0.58);
    const by = cubic(0, 1);
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  },
  linear: (x) => x,
};
const lerp = (a, b, t) => a + (b - a) * t;

/** The halo's scale, the ring's diameter and the ring's opacity at `ms` after a press. */
export function clickAt(ms) {
  let pop = 1;
  if (ms >= 0 && ms < POP.upMs) pop = lerp(1, POP.peak, EASE[POP.easing](ms / POP.upMs));
  else if (ms >= POP.upMs && ms < POP.upMs + POP.settleMs) {
    pop = lerp(POP.peak, 1, EASE[POP.easing]((ms - POP.upMs) / POP.settleMs));
  }
  const g = Math.min(Math.max(ms / RING_GROW.ms, 0), 1);
  const f = Math.min(Math.max(ms / RING_FADE.ms, 0), 1);
  return {
    pop: n(pop),
    ringD: n(RING_D * lerp(RING_FROM, 1, EASE[RING_GROW.easing](g))),
    ringOpacity: ms < 0 ? 0 : n(lerp(RING_FADE.from, 0, EASE[RING_FADE.easing](f))),
  };
}

// ---------------------------------------------------------------------------
// The manifest. Framework-agnostic data. The motion tracks are in the shape the
// Web Animations API takes, so the demo passes them straight to
// element.animate(track.keyframes, { duration: track.durationMs }), and the hero
// converts each keyframe's offset into its beat's percentages.
//
// NO CSS FILE SHIPS, deliberately. The task allowed one only if both consumers
// could use it, and neither can: the hero places its click inside an
// eight-second infinite beat, as percentages of that beat, and the demo animates
// with the Web Animations API at whatever moment its choreography presses. A
// keyframe file timed in absolute milliseconds serves neither. POINTER fails on
// a .css file in assets/pointer/.
// ---------------------------------------------------------------------------

const scale = (v) => `scale(${n(v)})`;

/** A Web Animations track. Each keyframe but the last carries its own segment easing. */
const track = (part, durationMs, frames) => ({
  part,
  durationMs,
  keyframes: frames.map(([offset, props, easing], i) => ({
    offset: n(offset),
    ...props,
    ...(i < frames.length - 1 ? { easing } : {}),
  })),
});

export function manifest() {
  const popMs = POP.upMs + POP.settleMs;
  return {
    $comment: "generated by scripts/gen-pointer.mjs - do not hand-edit",
    color: "currentColor - the consumer sets cream or ink; see tones",
    units: {
      px: "page pixels at host scale 1",
      hostScale:
        "A frame its host shows at scale s divides every length in divideByHostScale by s, so the dot keeps its page size. The host posts s; with no message s is 1.",
      divideByHostScale: DIVIDE_BY_HOST_SCALE,
      ringStroke: `The ring's stroke is non-scaling-stroke, so sizing its svg does not carry it along: set the ring circle's stroke-width to ${RING_STROKE} / s yourself.`,
    },
    anchor: "center - each svg's viewBox is centered on 0,0, the point the pointer marks",
    css: "none shipped - the hero's click lives inside an 8s beat as percentages and the demo animates with the Web Animations API, so an absolute-time keyframe file serves neither",
    dot: {
      file: DOT_FILE,
      box: DOT_BOX,
      boxNote: `sized to the halo at the peak of its pop (${n(POP.peak * HALO_D)}px), so an inline svg never clips it`,
      core: { diameter: CORE_D },
      halo: { diameter: HALO_D, edge: HALO_EDGE, fill: "the tone at haloFill", edgeFill: "the tone at haloEdge, painted over the fill" },
      aura: AURA,
    },
    ring: {
      file: RING_FILE,
      box: RING_BOX,
      diameter: RING_D,
      strokeWidth: RING_STROKE,
      from: RING_FROM,
      rest: "opacity 0. Clone the svg per press, run ringGrow and ringFade on its circle, and remove it when they finish.",
      stays: "where the press landed. It does not ride with the dot.",
      scale: "the circle, never the svg: non-scaling-stroke holds the hairline only against a transform inside the svg",
    },
    parts: {
      core: { in: DOT_FILE, ...PART_ORIGIN },
      halo: { in: DOT_FILE, ...PART_ORIGIN },
      "halo-fill": { in: DOT_FILE, weight: "fill-opacity" },
      "halo-edge": { in: DOT_FILE, weight: "stroke-opacity" },
      ring: { in: RING_FILE, ...PART_ORIGIN },
    },
    tones: {
      default: DEFAULT_TONE,
      ...Object.fromEntries(
        Object.entries(TONES).map(([id, t]) => [
          id,
          { color: t.color, over: `a ${t.ground} ground`, "halo-fill": t.haloFill, "halo-edge": t.haloEdge },
        ]),
      ),
      override:
        "The svg carries the default tone's weights as presentation attributes, so CSS on [data-part=halo-fill] (fill-opacity) and [data-part=halo-edge] (stroke-opacity) wins. A transition on those and on color gives the crossfade on one element.",
      rule: {
        for: "a consumer that picks its own tone (the demo). A host that names its tone (the hero) skips it.",
        measure: "the relative luminance of the first opaque background under the dot",
        creamBelow: TONE_RULE.creamBelowLuminance,
        crossfadeMs: TONE_RULE.crossfadeMs,
      },
    },
    states: {
      rest: { core: scale(1), halo: scale(1) },
      pressed: {
        core: scale(PRESS_SCALE),
        tween: "none - the core steps to it",
        holds: "from the press to the release, through a drag's carry",
      },
    },
    motion: {
      pop: track("halo", popMs, [
        [0, { transform: scale(1) }, POP.easing],
        [POP.upMs / popMs, { transform: scale(POP.peak) }, POP.easing],
        [1, { transform: scale(1) }],
      ]),
      ringGrow: track("ring", RING_GROW.ms, [
        [0, { transform: scale(RING_FROM) }, RING_GROW.easing],
        [1, { transform: scale(1) }],
      ]),
      ringFade: track("ring", RING_FADE.ms, [
        [0, { opacity: RING_FADE.from }, RING_FADE.easing],
        [1, { opacity: 0 }],
      ]),
    },
    events: {
      press: {
        does: ["states.pressed", "motion.pop", "motion.ringGrow", "motion.ringFade"],
        note: "Every press, whatever the button: a right-click and a select's pick draw as clicks, and a double-click is two presses, so two rings.",
      },
      release: {
        does: ["states.rest"],
        note: "No ring. A drag's drop is a release, not a click.",
      },
    },
    fillMode: "none - every part rests on its shipped attributes, so a finished animation returns to rest by itself",
    reducedMotion: "static - draw the dot at rest; play no press, pop or ring",
  };
}
