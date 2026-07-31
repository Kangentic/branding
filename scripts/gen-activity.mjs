// gen-activity.mjs - the activity icon set: the shipped marks, and the review
// harness that chose them.
//
// Writes TWO kinds of output, and the distinction matters:
//   assets/activity/       SHIPPED. Nine marks + activity.css + activity.json.
//                          Held to byte determinism by the release gate.
//   exploration/activity/  REVIEW. compare.html and the size strips. Exempt.
//
// Imports all geometry from lib/activity.mjs - NO geometry is re-declared here
// (the mark-geometry-single-source precedent). The shipped set is whichever
// direction has had its `draft` flag deleted; the lib throws if that is not
// exactly one direction.
// Usage: npm run gen:activity

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  DIRECTIONS,
  LIVE,
  shippedSet,
  BASELINE,
  fileFor,
  manifest,
  CONTROLS,
  CONTROL_FLOOR_PX,
  CONTROL_RENDER_PX,
  CONTROL_RING_R,
  RING_R,
  FLAP_DEFAULT,
  INK_BOX,
  flapVariant,
  LEGIBILITY_FLOOR_PX,
  MARCH_MS,
  REST_KEEP,
  REST_STATIC,
  SPIN_MS,
  STROKE,
  VIEW,
  dashInUserUnits,
  markSvg,
  motionCss,
  ENVELOPE_CANDIDATES,
  ENVELOPE_DEFAULT,
  FLAP_VARIANTS,
  candidateFlap,
  envelope,
  envelopeWith,
  envelopeBox,
  envelopeInk,
  chipInk,
  ringInk,
  INDICATOR_SIZES,
  DPRS,
  strokeCoverage,
  softnessAt,
  SLOT_CANDIDATES,
  SLOT_DEFAULT,
  slotBox,
  slotRing,
  SMALL_MASTER,
  smallMasterSvg,
} from "./lib/activity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "exploration", "activity");
await mkdir(OUT, { recursive: true });

// Mock surface colors: the three consumer grounds this set has to survive, with
// each surface's OWN status tokens. They are deliberately not equal - the set
// ships currentColor precisely so this divergence never reaches the geometry.
const GROUNDS = [
  {
    id: "desktop",
    label: "Desktop app",
    note: "identical across all 10 themes",
    bg: "#211c19",
    panel: "#2a2320",
    fg: "#d6d1c9",
    soft: "#8a8177",
    attention: "#e3b341",
    active: "#34d399",
    rest: "#6f675c",
  },
  {
    id: "mobile",
    label: "Mobile app",
    note: "one dark terminal theme",
    bg: "#0f0d0a",
    panel: "#1a1613",
    fg: "#d7d1c6",
    soft: "#857c71",
    attention: "#d9b83f",
    active: "#3ddc84",
    rest: "#6f675c",
  },
  {
    id: "web",
    label: "kangentic.com",
    note: "cream ground, status lamps",
    bg: "#fdfbf7",
    panel: "#f6f1e8",
    fg: "#24201b",
    soft: "#6e6659",
    attention: "#d98324",
    active: "#218a4c",
    rest: "#8d8579",
  },
];

const LADDER = [12, 14, 15, 16, 18, 20, 24];
const ROW_SIZE = 14; // CommandTerminalIcon.tsx in the project sidebar
const ADJACENCY_SIZES = [12, 14, 15, 16];

// The isolation ladder. 12 is not optional: absolute flap depth drops from 6.45
// to 5.16 on the shortest candidate box, so that is where the V could merge into
// the top edge. 14, 15 and 16 are the INDICATOR BAND (see INDICATOR_SIZES in the
// lib) and all three are here because the desktop renders all three.
const ISO_SIZES = [12, 14, 15, 16, 20, 24];
const CARD_SIZE = 16; // TaskCard.tsx
const TOOLTIP_SIZE = 12; // ActivityReasonTooltip.tsx

// Where each render size actually comes from, read off the desktop app's call
// sites rather than recalled.
//
// Corrected 2026-07-31, and the correction is the reason this round exists.
// This map used to read `{ 14: "task card", 16: "sidebar today" }` and CARD_SIZE
// used to be 14. Both were stale: TaskCard.tsx renders at 16 and has since the
// sidebar bump, and 15 was missing from this repo ENTIRELY - no ladder, no size
// strip, no isolation row - while three desktop surfaces render indicators at
// it. A band nothing here rendered is a band nothing here could review, which is
// exactly how an off-lattice mark reached three of them unexamined.
const SIZE_SOURCE = {
  12: "tooltip, sidebar group",
  14: "terminal, sidebar",
  15: "monitor card/table",
  16: "task card, sidebar project",
  18: "no consumer",
  20: "controls, title bar",
  24: "natural",
};

// The real TaskCard chrome, read off the running desktop app rather than
// guessed: `border rounded-md p-2.5 bg-surface-raised border-edge`, 272 wide,
// title `text-sm text-fg font-medium` at 14px/500, mono ID badge at 12px. The
// mark is the FIRST child of the title's `flex items-center gap-1.5` row. Mock
// fidelity is load-bearing here - see the acceptance test on the page.
// Geometry is fixed; the colours come from whichever ground is being drawn, so
// the light web ground does not get the desktop's dark card painted onto it.
// GROUNDS[0].panel IS #2a2320, so the desktop sheet reproduces the real card
// exactly and the other two get their own surface.
const CARD = { w: 272, radius: 6, pad: 10 };
const cardSkin = (g) => ({ bg: g.panel, border: g.soft, borderOpacity: 0.4, title: g.fg, desc: g.soft });

/**
 * The envelope candidates as renderable agent-idle marks, plus the real
 * production glyph as the control.
 *
 * Every one of these is `agent-idle`: same id, same role, same tone. Only the
 * box and the flap change, which is the whole question.
 */
const envMark = (c) => ({
  id: "agent-idle",
  role: "needs you",
  silhouette: "envelope",
  state: "idle",
  tone: "attention",
  ...envelope(c.id),
  motion: null,
  rest: REST_STATIC,
});
const ENV_ROWS = ENVELOPE_CANDIDATES.map((c) => {
  const b = envelopeBox(c.id);
  const f = candidateFlap(c.id);
  return {
    id: c.id,
    box: b,
    flap: f,
    ink: envelopeInk(c.id),
    note: c.note,
    shipped: c.id === ENVELOPE_DEFAULT,
    mark: envMark(c),
  };
});
// The control is the REAL production glyph, arc'd vertex and all, not a redraw
// of its box. `stock` is the redraw; this is what actually renders today.
//
// Its y edges are recorded because of what they turn out to be. A 20 x 16 box
// centred on 24 sits at y 4 and y 20 - the one pair that is crisp across the
// whole 14/15/16 band. So the stock glyph this set replaced was ALREADY on the
// pixel lattice, and the redraw to 18 x 14.4 is what took it off, to 4.8 and
// 19.2. The set was built to fix an ink-box disagreement and, without anyone
// looking, traded away a hinting property nobody had named. That is the whole
// of the "softer than the glyphs beside them" report, and it is why this row is
// the control for the lattice section as well as for the box study.
const PROD_ROW = {
  id: "production",
  box: { w: 20, h: 16, aspect: 1.25, x0: 2, y0: 4, x1: 22, y1: 20 },
  flap: { depth: 5.727, angle: 120.4 },
  ink: 91.9,
  note: "what ships in the desktop app today; the glyph the set has to beat, and the only one already on the pixel lattice",
  control: true,
  mark: BASELINE.marks.find((m) => m.id === "agent-idle"),
};
const ISO_ROWS = [PROD_ROW, ...ENV_ROWS];

const ALL = [BASELINE, ...LIVE];
const RETIRED = DIRECTIONS.filter((d) => d.retired);
const SET_MARKS = shippedSet().marks;
const d1 = LIVE.find((d) => d.id === "d1") ?? LIVE[0];

// A direction has a STATIC state channel when its two agent marks still differ
// once motion is removed, i.e. after each mark's declared rest rendering is
// applied. Derived rather than asserted in prose, so retiring or adding a
// direction can never leave the paragraph that reports it lying.
const restForm = (mark) =>
  `${mark.outline}|${mark.interior}|${mark.dash && mark.rest === REST_KEEP ? mark.dash : ""}`;
const hasStaticChannel = (dir) =>
  restForm(dir.marks.find((m) => m.id === "agent-idle")) !==
  restForm(dir.marks.find((m) => m.id === "agent-working"));
const ids = (list) => list.map((d) => d.id.toUpperCase()).join(", ");

const toneOf = (g, mark) =>
  mark.tone === "active" ? g.active : mark.tone === "attention" ? g.attention : mark.tone === "rest" ? g.rest : g.fg;

// The set's NINE marks and where each one lives, so the section reads as a set
// rather than as three indicators with two buttons bolted on.
//
// Corrected 2026-07-31. The comment said "five marks", the table listed eight
// keys, and the set is nine - `terminal-new` was absent. Five is the count of
// SILHOUETTES (envelope, ring, chip, pause ring, stop ring), which is what the
// prose meant and not what it said. The surfaces are now the desktop call sites
// with the size each renders at, because "where it lives" without a size is
// what let the 14-15-16 band go unreviewed.
const MARK_ROLES = {
  "agent-idle": "task card 16, sidebar 16/12, monitor 15, tooltip 12",
  "agent-working": "task card 16, sidebar 16/12, monitor 15, tooltip 12",
  "terminal-idle": "sidebar 14, title bar 20",
  "terminal-working": "sidebar 14, title bar 20",
  "terminal-new": "sidebar 14, title bar 20",
  "control-pause-idle": "task detail header 20",
  "control-pause-working": "task detail header 20",
  "control-stop-idle": "Command Terminal header 20",
  "control-stop-working": "Command Terminal header 20",
};

// Every mark now declares its own tone, so nothing needs re-toning for a
// specimen. The one exception is REST: the terminal and the stop button are
// both shown while nothing is happening, and that is the IDLE geometry in the
// muted tone rather than a mark of its own.
const asRest = (m) => ({ ...m, tone: "rest" });
const pick = (dir, id) => dir.marks.find((m) => m.id === id);
// The baseline predates the split and still carries a single `terminal` mark,
// so fall back to it rather than special-casing the control band.
const pickTerminal = (dir, state) => pick(dir, `terminal-${state}`) ?? pick(dir, "terminal");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Angles are computed to 4dp for determinism upstream; one decimal is what a
// reader can act on, and the differences that matter here are whole degrees.
const deg = (v) => v.toFixed(1);
const angleOf = (flapId, boxId) => deg(flapVariant(flapId, boxId).angle);

/** One mark, coloured for a ground, at a size. */
const spec = (g, mark, size, opts = {}) =>
  `<span class="glyph" style="color:${toneOf(g, mark)}">${markSvg(mark, { size, ...opts })}</span>`;

/**
 * A glyph with its count, exactly as the project sidebar renders it: 11px
 * tabular digits in the mark's own tone, 4px from the glyph. Every comparison
 * on this page uses this rather than a bare glyph, because the count is always
 * there in the real row and it changes how much space the mark actually gets.
 */
const counterHtml = (g, mark, count, size = ROW_SIZE, opts = {}) =>
  `<span class="counter" style="color:${opts.ink ?? toneOf(g, mark)}">${markSvg(mark, { size, ...opts })}${count == null ? "" : `<b>${count}</b>`}</span>`;

/** A surface tile: a real ground with real tokens, not a swatch. */
const tile = (g, body, extraClass = "") =>
  `<div class="tile ${extraClass}" style="--bg:${g.bg};--panel:${g.panel};--fg:${g.fg};--soft:${g.soft}">
     <div class="tile-hd"><span class="tile-name">${g.label}</span><span class="tile-note">${g.note}</span></div>
     ${body}
   </div>`;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ONE MARK, ALONE. The view this page did not have, and the reason a broken
// mark shipped.
//
// Every other cell on this page is comparative BY CONSTRUCTION: stacked rows,
// adjacency pairs, counters in fixed cells against a hairline datum. That is the
// right instrument for an ink-box question and the wrong one for a recognition
// question, because a mark that only fails with nothing beside it has no cell
// here that can see it. The board renders ONE mark on a card. That is where the
// square envelope stopped reading as an envelope.
//
// The previous round asserted this view would be uninformative - "a redrawn
// envelope looks almost identical to the stock one on its own, because what
// changed is the ink box, and an ink box is only visible next to another one" -
// and used that assertion to justify not building it. That was the load-bearing
// mistake, and it is what these two functions undo.
// ---------------------------------------------------------------------------

/**
 * The real TaskCard, carrying exactly ONE mark and no sibling glyph.
 *
 * Chrome read off the running desktop app, not guessed: the mark is the first
 * child of the title's `flex items-center gap-1.5` row, ahead of a 14px/500
 * title and a mono ID badge, on `bg-surface-raised` inside a 1px `border-edge`
 * at radius 6. Fidelity is the whole point - if this mock renders the incumbent
 * and the incumbent looks fine, the mock is wrong, not the criterion.
 */
function taskCardMock(mark, size = CARD_SIZE) {
  const g = GROUNDS[0];
  return `<div class="iso-card">
    <div class="iso-hd">
      <span class="glyph" style="color:${g.attention}">${markSvg(mark, { size })}</span>
      <span class="iso-title">Re-review the activity icon set</span>
      <span class="iso-badge">#12</span>
    </div>
    <p class="iso-desc">Adopting the set in the desktop app surfaced a display problem the selection process did not catch.</p>
  </div>`;
}

/** ActivityReasonTooltip, at its real 12px, beside its real copy. */
function tooltipMock(mark) {
  const g = GROUNDS[0];
  return `<div class="iso-tip"><span class="glyph" style="color:${g.attention}">${markSvg(mark, {
    size: TOOLTIP_SIZE,
  })}</span><span>Idle for 4m</span></div>`;
}

function isolationSection() {
  const tag = (r) =>
    r.control ? `<span class="iso-tag iso-tag--prod">production</span>`
    : r.shipped ? `<span class="iso-tag iso-tag--ship">shipped 2.5.0</span>`
    : "";
  const cell = (r) => `<figure class="iso${r.control ? " iso--control" : ""}${r.shipped ? " iso--shipped" : ""}">
      ${taskCardMock(r.mark)}
      ${tooltipMock(r.mark)}
      <figcaption>
        <span class="iso-name"><b>${r.id}</b>${tag(r)}</span>
        <span>${r.box.w} x ${r.box.h}, aspect ${r.box.aspect}</span>
        <span>flap ${deg(r.flap.angle)} deg, ink ${deg(r.ink)}</span>
      </figcaption>
    </figure>`;
  return `<div class="iso-grid">${ISO_ROWS.map(cell).join("")}</div>`;
}

/**
 * The recognition ladder. Adjacency IS wanted here - you cannot judge "does this
 * read as mail" without something to read it against - but there is no alignment
 * datum and no sibling mark from the set in any cell. Each cell is one glyph,
 * alone, at a real render size.
 */
function recognitionLadder() {
  const g = GROUNDS[0];
  const head =
    `<div class="grid-cell grid-cell--rowhead"></div>` +
    ISO_SIZES.map(
      (s) =>
        `<div class="grid-cell${INDICATOR_SIZES.includes(s) ? " grid-cell--band" : ""}"><b>${s}px</b><span>${SIZE_SOURCE[s] ?? ""}</span></div>`,
    ).join("");
  const rows = ISO_ROWS.map(
    (r) => `<div class="grid-row${r.control ? " grid-row--base" : ""}">
      <div class="grid-cell grid-cell--rowhead"><b>${r.id}</b><span>${r.box.w} x ${r.box.h}</span></div>
      ${ISO_SIZES.map(
        (s) =>
          `<div class="grid-cell"><span class="recog" style="color:${g.attention}">${markSvg(r.mark, { size: s })}</span></div>`,
      ).join("")}
    </div>`,
  ).join("");
  return grid(`150px repeat(${ISO_SIZES.length}, minmax(64px, 1fr))`, head, rows);
}

// ---------------------------------------------------------------------------
// THE PIXEL LATTICE. Where a stroke lands on the device grid at 14, 15 and 16.
//
// This is the section the hinting round added, and its instrument is different
// from every other one on this page: the marks are rendered at TRUE SIZE, in the
// DOM, by the browser you are reading this in. That is deliberate and it is the
// only honest way to judge the question.
//
// Not a <canvas> band. Drawing an SVG into a canvas at 14px rasterizes it at its
// intrinsic size and then RESAMPLES the bitmap, where the DOM scales the stroke
// geometry and rasterizes once at 14. Those produce different edge coverage,
// which is precisely the quantity under judgement, so a canvas band captioned
// "the browser's own rendering" would be showing something else - the exact
// review-artifact failure brand-record-fidelity.md is built around.
//
// The magnified view is the sharp/librsvg _isolation-zoom-*.png sheet, captioned
// with its renderer, plus a screenshot of the band below when a pick needs
// confirming in Chromium's own AA.
// ---------------------------------------------------------------------------

/**
 * A candidate's hinting score: the mean edge softness of its top and bottom,
 * across every display scaling and every size in the band.
 *
 * Both edges, averaged, because a box has two and a reader judges the glyph
 * rather than one line of it. Lower is sharper; 0 means both edges land exactly
 * on pixel boundaries.
 */
const softnessOf = (y0, y1, cssPx, dpr) => n2((softnessAt(y0, cssPx, dpr) + softnessAt(y1, cssPx, dpr)) / 2);
const n2 = (v) => Math.round(v * 1000) / 1000;

const scoreBox = (y0, y1) => {
  const cells = DPRS.map((dpr) => ({
    dpr,
    sizes: INDICATOR_SIZES.map((cssPx) => ({ cssPx, softness: softnessOf(y0, y1, cssPx, dpr) })),
  }));
  return { cells, total: n2(cells.reduce((s, r) => s + r.sizes.reduce((a, c) => a + c.softness, 0), 0)) };
};

const LATTICE_ROWS = ISO_ROWS.filter((r) => r.box.y0 !== undefined).map((r) => ({
  ...r,
  ...scoreBox(r.box.y0, r.box.y1),
}));
// Rank so the sheet can mark the sharpest cell in every column rather than
// leaving the reader to scan twelve columns of decimals for the minimum.
const bestAt = (dpr, cssPx) =>
  Math.min(...LATTICE_ROWS.map((r) => r.cells.find((c) => c.dpr === dpr).sizes.find((s) => s.cssPx === cssPx).softness));
const bestTotal = Math.min(...LATTICE_ROWS.map((r) => r.total));

/**
 * The candidates at TRUE 14 / 15 / 16, alone, on all three consumer grounds.
 *
 * Repeated three times per cell rather than once. A single tiny glyph is hard to
 * read a smear off; a short run of the same glyph makes an uneven edge obvious
 * the way a line of type makes an uneven baseline obvious.
 */
function latticeSpecimens() {
  const cell = (g, r, s) =>
    `<div class="grid-cell"><span class="lat" style="color:${g.attention}">${markSvg(r.mark, { size: s, resting: true }).repeat(3)}</span></div>`;
  const one = (g) => {
    const head =
      `<div class="grid-cell grid-cell--rowhead"><b>${g.label}</b><span>${g.note}</span></div>` +
      INDICATOR_SIZES.map(
        (s) => `<div class="grid-cell grid-cell--band"><b>${s}px</b><span>${SIZE_SOURCE[s]}</span></div>`,
      ).join("");
    const rows = LATTICE_ROWS.map(
      (r) => `<div class="grid-row${r.control ? " grid-row--base" : ""}">
        <div class="grid-cell grid-cell--rowhead"><b>${r.id}</b><span>y ${r.box.y0} / ${r.box.y1}</span></div>
        ${INDICATOR_SIZES.map((s) => cell(g, r, s)).join("")}
      </div>`,
    ).join("");
    return grid(`170px repeat(${INDICATOR_SIZES.length}, minmax(120px, 1fr))`, head, rows);
  };
  return GROUNDS.map(one).join("");
}

/**
 * The candidates as numbers, across every display scaling.
 *
 * The scaling axis is not decoration. At dpr 1.5 a 16px render is scale 1.0
 * with a 2.0px stroke, so every integer coordinate is PERFECTLY hard and the
 * shipped box is the only soft one; at dpr 1 the whole band is soft and the
 * spread is widest; at dpr 1.25 and 2 the shipped box wins some cells outright.
 * A single-dpr table would have reported one of those three stories as the
 * whole truth.
 */
function latticeTable() {
  const head =
    `<div class="grid-cell grid-cell--rowhead"></div>` +
    DPRS.flatMap((dpr) =>
      INDICATOR_SIZES.map(
        (s) =>
          `<div class="grid-cell${dpr === 1 ? " grid-cell--band" : ""}"><b>${s}</b><span>${dpr}x</span></div>`,
      ),
    ).join("") +
    `<div class="grid-cell"><b>total</b><span>lower is sharper</span></div>`;
  const rows = LATTICE_ROWS.map(
    (r) => `<div class="grid-row${r.control ? " grid-row--base" : ""}">
      <div class="grid-cell grid-cell--rowhead"><b>${r.id}</b><span>y ${r.box.y0} / ${r.box.y1}</span></div>
      ${r.cells
        .flatMap((c) =>
          c.sizes.map(
            (s) =>
              `<div class="grid-cell"><span class="mono ${s.softness <= bestAt(c.dpr, s.cssPx) + 1e-9 ? "lat-ok" : "lat-soft"}">${s.softness.toFixed(3)}</span></div>`,
          ),
        )
        .join("")}
      <div class="grid-cell"><span class="mono ${r.total <= bestTotal + 1e-9 ? "lat-ok" : "lat-soft"}">${r.total.toFixed(2)}</span></div>
    </div>`,
  ).join("");
  return grid(
    `150px repeat(${DPRS.length * INDICATOR_SIZES.length}, minmax(58px, 1fr)) 90px`,
    head,
    rows,
  );
}

/**
 * The slot axis: the ring at its shipped r=9 against r=8.
 *
 * The ring alone, because the ring IS the slot - its extrema are the keyline, so
 * it is the mark the slot decides. Rendered as INFORMATION, not as a promotable
 * cell: moving the slot moves INK_BOX, which lib/ui-glyphs.mjs imports, so it
 * regenerates the kanban glyph and the iOS tab rasters that the store
 * screenshots were captured against.
 */
function slotBand() {
  const g = GROUNDS[0];
  const head =
    `<div class="grid-cell grid-cell--rowhead"></div>` +
    INDICATOR_SIZES.map((s) => `<div class="grid-cell grid-cell--band"><b>${s}px</b></div>`).join("") +
    `<div class="grid-cell"><b>softness</b><span>all dpr x sizes</span></div>`;
  const rows = SLOT_CANDIDATES.map((c) => {
    const s = slotBox(c.id);
    const mark = { id: "agent-working", tone: "active", ...slotRing(c.id), motion: null, rest: REST_STATIC };
    const total = scoreBox(s.min, s.max).total;
    return `<div class="grid-row${c.shipped ? " grid-row--base" : ""}">
      <div class="grid-cell grid-cell--rowhead"><b>${c.id}</b><span>x ${s.min}..${s.max}, r=${s.ringR}</span></div>
      ${INDICATOR_SIZES.map(
        (px) =>
          `<div class="grid-cell"><span class="lat" style="color:${g.active}">${markSvg(mark, { size: px }).repeat(3)}</span></div>`,
      ).join("")}
      <div class="grid-cell"><span class="mono ${c.shipped ? "lat-soft" : "lat-ok"}">${total.toFixed(2)}</span></div>
    </div>`;
  }).join("");
  return grid(`170px repeat(${INDICATOR_SIZES.length}, minmax(120px, 1fr)) 130px`, head, rows);
}

/** The brief's prescribed second master, rendered so it is judged not argued. */
function smallMasterBand() {
  const g = GROUNDS[0];
  const forms = ["ring", "envelope"];
  const head =
    `<div class="grid-cell grid-cell--rowhead"></div>` +
    INDICATOR_SIZES.map((s) => `<div class="grid-cell grid-cell--band"><b>${s}px</b></div>`).join("") +
    `<div class="grid-cell"><b>stroke</b><span>device px at 16</span></div>`;
  const rows = [
    ...SMALL_MASTER.strokes.map((stroke) =>
      forms
        .map(
          (form) => `<div class="grid-row">
        <div class="grid-cell grid-cell--rowhead"><b>${SMALL_MASTER.id} ${form}</b><span>stroke ${stroke} on a ${SMALL_MASTER.view} grid</span></div>
        ${INDICATOR_SIZES.map(
          (s) =>
            `<div class="grid-cell"><span class="lat" style="color:${form === "ring" ? g.active : g.attention}">${smallMasterSvg(
              form,
              { size: s, stroke },
            ).repeat(3)}</span></div>`,
        ).join("")}
        <div class="grid-cell"><span class="mono">${((stroke * 16) / SMALL_MASTER.view).toFixed(3)}px</span></div>
      </div>`,
        )
        .join(""),
    ),
    // The 24-grid siblings on the same row pitch, so the WEIGHT difference is
    // side by side rather than a paragraph away. This is the whole objection.
    `<div class="grid-row grid-row--base">
      <div class="grid-cell grid-cell--rowhead"><b>24 grid, shipped</b><span>stroke ${STROKE} on a ${VIEW} grid</span></div>
      ${INDICATOR_SIZES.map(
        (s) =>
          `<div class="grid-cell"><span class="lat" style="color:${g.active}">${markSvg(
            { id: "agent-working", tone: "active", ...slotRing(SLOT_DEFAULT), motion: null, rest: REST_STATIC },
            { size: s },
          ).repeat(3)}</span></div>`,
      ).join("")}
      <div class="grid-cell"><span class="mono">${((STROKE * 16) / VIEW).toFixed(3)}px</span></div>
    </div>`,
  ].join("");
  return grid(`190px repeat(${INDICATOR_SIZES.length}, minmax(120px, 1fr)) 130px`, head, rows);
}

// ---------------------------------------------------------------------------
// THE BOX STUDY. The candidates at size, with every number that decides them
// printed rather than asserted, and the alignment cost on the same screen as
// the recognition win.
// ---------------------------------------------------------------------------

function boxSpecimens() {
  const g = GROUNDS[0];
  return `<div class="dir-big">${ISO_ROWS.map(
    (r) => `<figure class="big">
      <span class="glyph" style="color:${g.attention}">${markSvg(r.mark, { size: 96 })}</span>
      <figcaption>${r.id}
        <span>${r.box.w} x ${r.box.h}, aspect ${r.box.aspect}</span>
        <span>flap ${deg(r.flap.angle)} deg, depth ${r.flap.depth}</span>
        <span>ink ${deg(r.ink)}</span>
      </figcaption>
    </figure>`,
  ).join("")}</div>`;
}

/**
 * The alignment cost, in the instrument that measures it: counters in fixed
 * cells against a hairline datum. Only `stock` should move the column, because
 * only `stock` is not 18 wide. This is the cell that answers "is the alignment
 * win worth anything" - without it, that question has no evidence either way.
 */
function boxAlignmentBand() {
  const g = GROUNDS[0];
  const working = d1.marks.find((m) => m.id === "agent-working");
  const term = pickTerminal(d1, "idle");
  const cell = (mark, count) => `<span class="align-cell">${counterHtml(g, mark, count)}</span>`;
  return `<div class="align" style="background:${g.bg}">${ISO_ROWS.map(
    (r) => `<div class="align-group${r.control ? " align-group--base" : ""}">
      <span class="align-id">${r.id}<em>${r.box.w} x ${r.box.h}</em></span>
      <div class="align-lines">
        <div class="align-line">
          <span class="align-name">kangentic</span>
          <span class="align-counts">${cell(r.mark, 2)}${cell(working, 1)}${cell(term, 1)}</span>
        </div>
      </div>
    </div>`,
  ).join("")}</div>`;
}

/**
 * The coupling the last round missed, rendered.
 *
 * Flap ratios are fractions of the box, so transplanting them onto a box of a
 * different aspect does NOT carry the angle across: the half-width changes with
 * the width and the depth changes with the height. Read a row across and the
 * same named flap yields a different V on every box.
 */
function flapCouplingTable() {
  const g = GROUNDS[0];
  // One column per distinct BOX, so the same named flap can be read across.
  const boxes = ENVELOPE_CANDIDATES.filter(
    (c, i, a) => a.findIndex((o) => o.w === c.w && o.h === c.h) === i,
  ).map((c) => envelopeBox(c.id));
  const head =
    `<div class="grid-cell grid-cell--rowhead"><b>flap</b><span>ratios of box height</span></div>` +
    boxes.map((b) => `<div class="grid-cell"><b>${b.w} x ${b.h}</b><span>half-width ${b.w / 2}</span></div>`).join("");
  const rows = FLAP_VARIANTS.map((v) => {
    const cells = boxes
      .map((b) => {
        const f = flapVariant(v.id, b.id);
        const svg = markSvg({ ...envMark(b), ...envelopeWith(b.id, v.id) }, { size: 34 });
        return `<div class="grid-cell grid-cell--flap"><span class="recog" style="color:${g.attention}">${svg}</span><span class="deg">${deg(f.angle)} deg</span></div>`;
      })
      .join("");
    return `<div class="grid-row${v.id === FLAP_DEFAULT ? " grid-row--base" : ""}">
      <div class="grid-cell grid-cell--rowhead"><b>${v.id}</b><span>${v.top} / ${v.vertex}</span></div>
      ${cells}
    </div>`;
  }).join("");
  return grid(`150px repeat(${boxes.length}, minmax(110px, 1fr))`, head, rows);
}

/** The project sidebar row, rebuilt from the live DOM this set has to fit. */
function sidebarRow(g, dir, { terminal = true } = {}) {
  const idle = dir.marks.find((m) => m.id === "agent-idle");
  const working = dir.marks.find((m) => m.id === "agent-working");
  const termIdle = pickTerminal(dir, "idle");
  const counter = (mark, count) => counterHtml(g, mark, count);
  return `<div class="row">
    <span class="row-name">kangentic</span>
    <span class="row-counts">${counter(idle, 2)}${counter(working, 1)}${terminal ? counter(termIdle, 1) : ""}</span>
  </div>
  <div class="row row--quiet">
    <span class="row-name">kangentic-mobile</span>
    <span class="row-counts">${counter(idle, 1)}${counter(working, 3)}</span>
  </div>`;
}

/**
 * The problem itself, in one glance. What this task fixes is the INK BOX, which
 * is a row-alignment property, not a glyph property: a redrawn envelope looks
 * almost identical to the stock one on its own, and only shows its hand when
 * rows are stacked and the counters have to line up. Each counter sits in a
 * fixed cell with a hairline datum, so drift is measurable by eye.
 */
/**
 * Two project rows per direction, because the Command Terminal aggregates to
 * ONE tone per project: a single row can show it needing you or working, never
 * both. The first project has an amber terminal, the second a green one that
 * marches, which is the pair the real sidebar puts on screen.
 */
function alignmentBand() {
  const g = GROUNDS[0];
  const cell = (mark, count) => `<span class="align-cell">${counterHtml(g, mark, count)}</span>`;
  const group = (dir) => {
    const idle = dir.marks.find((m) => m.id === "agent-idle");
    const working = dir.marks.find((m) => m.id === "agent-working");
    const termIdle = pickTerminal(dir, "idle");
    const line = (name, counts, quiet) =>
      `<div class="align-line${quiet ? " align-line--quiet" : ""}">
        <span class="align-name">${name}</span>
        <span class="align-counts">${counts}</span>
      </div>`;
    return `<div class="align-group${dir.id === "now" ? " align-group--base" : ""}">
      <span class="align-id">${dir.id.toUpperCase()}<em>${dir.label}</em></span>
      <div class="align-lines">
        ${line("kangentic", cell(idle, 2) + cell(working, 1) + cell(pickTerminal(dir, "idle"), 1))}
        ${line("kangentic-mobile", cell(idle, 1) + cell(working, 3) + cell(pickTerminal(dir, "working"), 1), true)}
      </div>
    </div>`;
  };
  return `<div class="align" style="background:${g.bg}">${ALL.map(group).join("")}</div>`;
}

// The two adjacencies this set actually has to survive, and the two conditions
// that strip a channel away. Agent idle and agent working render side by side in
// the same row whenever a project has both, so telling THEM apart is the first
// test; telling the pair apart from the terminal chip is the second. Reduced
// motion removes the motion channel and greyscale removes the colour channel,
// which is where a one-silhouette direction has nowhere left to hide.
const PAIR_TESTS = [
  { id: "live", label: "As it renders", note: "idle beside working, real tones, motion running" },
  { id: "still", label: "Motion off", note: "the same pair, reduced motion" },
  { id: "mono", label: "Shape alone", note: "one neutral colour, motion off" },
  { id: "term", label: "Against the terminal", note: "amber idle beside an amber terminal chip" },
  { id: "termwork", label: "Both working", note: "green working agent beside a green working terminal" },
  { id: "controls", label: "Beside the controls", note: "working agent, then the pause and stop buttons" },
];

// Where each mark renders and at what size. The controls really are bigger in
// the app, but that is placement, not geometry: a header button is a target and
// a row indicator is a label. Stated once here rather than demonstrated inside a
// comparison column, where an honest size difference reads as an inconsistency.
const SURFACE_SIZES = [
  ["Project sidebar row", 14],
  ["Sidebar group header", 12],
  ["Task card", 14],
  ["Activity tooltip", 12],
  ["Pause / stop button", CONTROL_RENDER_PX],
  ["Terminal panel", 8],
];

function pairCell(dir, test) {
  const g = GROUNDS[0];
  const idle = dir.marks.find((m) => m.id === "agent-idle");
  const working = dir.marks.find((m) => m.id === "agent-working");
  if (test === "term") {
    const term = pickTerminal(dir, "idle");
    return `<div class="pair">${counterHtml(g, { ...idle, tone: "attention" }, 2, ROW_SIZE, { resting: true })}${counterHtml(g, term, 1, ROW_SIZE, { resting: true })}</div>`;
  }
  // The worst case for any direction that shares a frame between the agent and
  // the terminal: both marks working, so both are green and both are marching,
  // and only the interior is left to say which object is which.
  if (test === "termwork") {
    const term = pickTerminal(dir, "working");
    return `<div class="pair">${counterHtml(g, working, 1)}${counterHtml(g, term, 1)}</div>`;
  }
  // Every cell in this table is one size, including this one. What is being
  // judged is whether the DRAWINGS stay distinct; the real render sizes are
  // listed once in the controls section rather than mixed in here.
  if (test === "controls") {
    return `<div class="pair">${counterHtml(g, working, 1)}${CONTROLS.map(
      (c) => counterHtml(g, c.onGrid[1], null),
    ).join("")}</div>`;
  }
  const resting = test !== "live";
  const ink = (m) => (test === "mono" ? g.fg : undefined);
  return `<div class="pair">${counterHtml(g, idle, 2, ROW_SIZE, { resting, ink: ink(idle) })}${counterHtml(g, working, 1, ROW_SIZE, { resting, ink: ink(working) })}</div>`;
}

// A grid rather than a table: the header and the body have to share column
// widths exactly, and subgrid guarantees that where a table's auto layout was
// letting the wrapped header captions and the narrow icon cells drift apart.
function grid(cols, head, rows) {
  return `<div class="scroll"><div class="grid" style="--cols:${cols}">
    <div class="grid-row grid-row--head">${head}</div>
    ${rows}
  </div></div>`;
}

function adjacencyTable() {
  const head =
    `<div class="grid-cell grid-cell--rowhead"></div>` +
    PAIR_TESTS.map((t) => `<div class="grid-cell"><b>${t.label}</b><span>${t.note}</span></div>`).join("");
  const rows = ALL.map(
    (dir) => `<div class="grid-row${dir.id === "now" ? " grid-row--base" : ""}">
      <div class="grid-cell grid-cell--rowhead"><b>${dir.id.toUpperCase()}</b><span>${dir.label}</span></div>
      ${PAIR_TESTS.map((t) => `<div class="grid-cell">${pairCell(dir, t.id)}</div>`).join("")}
    </div>`,
  ).join("");
  return grid(`150px repeat(${PAIR_TESTS.length}, minmax(112px, 1fr))`, head, rows);
}

/** The agent pair against the terminal chip, down the size ladder. */
function adjacencySizes(dir) {
  const g = GROUNDS[0];
  const idle = { ...dir.marks.find((m) => m.id === "agent-idle"), tone: "attention" };
  const term = pickTerminal(dir, "idle");
  const at = (size) =>
    `<div class="adj-cell">
       <div class="adj-pair" style="color:${g.attention}">${markSvg(idle, { size, resting: true })}${markSvg(term, { size, resting: true })}</div>
       <span class="px">${size}px</span>
     </div>`;
  return `<div class="adj-row">
    <div class="adj-label"><b>${dir.label}</b></div>
    <div class="adj-cells">${ADJACENCY_SIZES.map(at).join("")}</div>
  </div>`;
}

function directionSection(dir) {
  const g0 = GROUNDS[0];
  // No re-toning: every mark declares its own tone now that the states are
  // named rather than composed.
  const seen = dir.marks;

  const big = seen
    .map(
      (m) => `<figure class="big">
        <span class="glyph" style="color:${toneOf(g0, m)}">${markSvg(m, { size: 96 })}</span>
        <figcaption>${m.id}<span>${m.role}</span><span>${MARK_ROLES[m.id] ?? ""}</span></figcaption>
      </figure>`,
    )
    .join("");

  const ladder = seen
    .map(
      (m) => `<tr>
        <th>${m.id}</th>
        ${LADDER.map((s) => `<td>${spec(g0, m, s)}</td>`).join("")}
      </tr>`,
    )
    .join("");

  const grounds = GROUNDS.map((g) =>
    tile(g, `<div class="strip">${seen.map((m) => spec(g, m, ROW_SIZE)).join("")}</div>`),
  ).join("");

  // Each silhouette with its named marks. Rest is the extra column, and only
  // where a mark is on screen while nothing is happening: the terminal
  // indicator and the stop button. It reuses the -idle geometry in the muted
  // tone, which is why there is no -rest mark to ship.
  const toneGroup = (id, label, withRest) => {
    const idleM = pick(dir, `${id}-idle`);
    const workM = pick(dir, `${id}-working`);
    if (!idleM || !workM) return "";
    const states = [
      ...(withRest ? [[asRest(idleM), `${id}-idle, muted`]] : []),
      [idleM, `${id}-idle`],
      [workM, `${id}-working`],
    ];
    return `<div class="tone-group">
      <h5>${label}</h5>
      <div class="tone-row" style="background:${g0.bg}">${states
        .map(
          ([s, name]) => `<figure class="tone">
            ${spec(g0, s, 24)}${spec(g0, s, ROW_SIZE)}
            <figcaption>${name}</figcaption>
          </figure>`,
        )
        .join("")}</div>
    </div>`;
  };
  const tones =
    toneGroup("terminal", "Terminal indicator", true) +
    toneGroup("control-pause", "Pause button", false) +
    toneGroup("control-stop", "Stop button", true);

  const situ = tile(GROUNDS[0], `<div class="sidebar">${sidebarRow(GROUNDS[0], dir)}</div>`, "tile--situ");

  const rot = dir.rotatable
    ? `<span class="ok">rotation available</span>`
    : `<span class="no">rotation not available: rotating this working mark either tilts a frame or shows nothing, so the marching dash comes with this direction</span>`;

  return `<section class="dir" id="${dir.id}">
    <header class="dir-hd">
      <h3><span class="dir-id">${dir.id.toUpperCase()}</span> ${dir.label}</h3>
      <p>${esc(dir.blurb)}</p>
      <p class="dir-motion">${rot}</p>
    </header>
    <div class="dir-big">${big}</div>
    <div class="dir-grid">
      <div class="panel">
        <h4>Size ladder</h4>
        <div class="scroll"><table class="ladder">
          <thead><tr><th></th>${LADDER.map((s) => `<td class="px">${s}</td>`).join("")}</tr></thead>
          <tbody>${ladder}</tbody>
        </table></div>
      </div>
      <div class="panel">
        <h4>In situ, project sidebar at ${ROW_SIZE}px</h4>
        ${situ}
      </div>
    </div>
    <div class="dir-grid">
      <div class="panel">
        <h4>Each silhouette, with its named marks</h4>
        ${tones}
      </div>
      <div class="panel">
        <h4>Every consumer ground at ${ROW_SIZE}px, with that surface's own tokens</h4>
        <div class="tiles">${grounds}</div>
      </div>
    </div>
  </section>`;
}

/**
 * The controls a candidate has to survive beside. Rendered at their real 20px
 * against each direction's agent marks at the real 14px, on the desktop ground.
 */
function controlsSection() {
  const g = GROUNDS[0];
  const states = (list) =>
    `<div class="ctrl-states">${list
      .map(
        (s) =>
          `<span class="ctrl-state"><span class="glyph" style="color:${toneOf(g, s)}">${markSvg(s, { size: CONTROL_RENDER_PX })}</span><span class="px">${s.id}</span></span>`,
      )
      .join("")}</div>`;
  const ctrl = (c) =>
    `<figure class="ctrl">
      ${states(c.states)}
      <figcaption><b>${c.label}</b><span>${c.where}</span><span>as shipped, ring r=${CONTROL_RING_R}</span></figcaption>
    </figure>
    <figure class="ctrl ctrl--grid">
      ${states(c.onGrid)}
      <figcaption><b>${c.label}</b><span>on the set's grid</span><span>ring r=${RING_R}, ${INK_BOX} ink box</span></figcaption>
    </figure>`;
  // Everything at the SAME px here, so what is being compared is the drawing
  // rather than the render size. The controls ship at 20px and the indicators
  // at 14, but that is placement, not geometry.
  const against = (dir) => {
    const idle = dir.marks.find((m) => m.id === "agent-idle");
    const working = dir.marks.find((m) => m.id === "agent-working");
    const shipped = CONTROLS[1].states[1];
    const onGrid = CONTROLS[1].onGrid[1];
    const cell = (m) => `<span style="color:${toneOf(g, m)}">${markSvg(m, { size: CONTROL_RENDER_PX })}</span>`;
    return `<div class="grid-row">
      <div class="grid-cell grid-cell--rowhead"><b>${dir.id.toUpperCase()}</b><span>${dir.label}</span></div>
      <div class="grid-cell"><div class="pair">${cell(idle)}${cell(working)}</div></div>
      <div class="grid-cell"><div class="pair">${cell(shipped)}${cell(onGrid)}</div></div>
    </div>`;
  };
  const head = `<div class="grid-cell grid-cell--rowhead"></div>
    <div class="grid-cell"><b>Agent marks</b><span>idle, working</span></div>
    <div class="grid-cell"><b>Stop control, working</b><span>as shipped r=${CONTROL_RING_R}, then on the set's grid r=${RING_R}</span></div>`;
  // The one place render size is shown as size. Every mark is the SAME drawing
  // at every surface; only the box it is asked to fill changes.
  const chosen = LIVE.find((d) => d.id === "d7") ?? LIVE[0];
  const sample = chosen.marks.find((m) => m.id === "agent-working");
  const sizes = SURFACE_SIZES.map(
    ([where, px]) => `<figure class="size-cell">
      <span class="glyph" style="color:${g.active}">${markSvg(sample, { size: px })}</span>
      <figcaption><b>${px}px</b><span>${where}</span></figcaption>
    </figure>`,
  ).join("");
  return `<div class="ctrl-row">${CONTROLS.map(ctrl).join("")}</div>
    ${grid("150px repeat(2, minmax(150px, 1fr))", head, ALL.map(against).join(""))}
    <h4 class="size-hd">Where each mark renders, and how big</h4>
    <div class="size-row">${sizes}</div>`;
}

function motionSection() {
  const g = GROUNDS[0];
  const working = d1.marks.find((m) => m.id === "agent-working");
  const term = pickTerminal(d1, "working");
  const spinArc = BASELINE.marks.find((m) => m.id === "agent-working");
  const cell = (label, mark, opts, note) =>
    `<figure class="motion-cell">
      <span class="glyph" style="color:${toneOf(g, mark)}">${markSvg(mark, { size: 64, ...opts })}</span>
      <span class="glyph" style="color:${toneOf(g, mark)}">${markSvg(mark, { size: ROW_SIZE, ...opts })}</span>
      <figcaption><b>${label}</b><span>${note}</span></figcaption>
    </figure>`;
  return `<div class="motion-grid">
    ${cell("M1 march, spinner", working, {}, `dash 25/75, ${MARCH_MS}ms linear`)}
    ${cell("M1 march, chip", term, {}, `dash 65/35, ${MARCH_MS}ms linear`)}
    ${cell("M2 rotation", spinArc, { motion: "spin" }, `stock arc, ${SPIN_MS}ms linear`)}
  </div>`;
}

function restSection() {
  const g = GROUNDS[0];
  const working = d1.marks.find((m) => m.id === "agent-working");
  const term = pickTerminal(d1, "working");
  const cell = (mark, note) =>
    `<figure class="motion-cell">
      <span class="glyph" style="color:${toneOf(g, mark)}">${markSvg(mark, { size: 64, resting: true })}</span>
      <span class="glyph" style="color:${toneOf(g, mark)}">${markSvg(mark, { size: ROW_SIZE, resting: true })}</span>
      <figcaption><b>${mark.rest}</b><span>${note}</span></figcaption>
    </figure>`;
  return `<div class="motion-grid">
    ${cell(working, "the spinner holds its dash: a stopped short arc still reads as a spinner")}
    ${cell(term, "the chip drops its dash: freezing 65/35 would leave a hole punched in the ring")}
  </div>`;
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const CSS = `
:root {
  --cream:#fdfbf7; --panel-warm:#f6f1e8; --ink:#24201b; --ink-soft:#6e6659;
  --rust:#c0562f; --hairline:rgba(36,32,27,0.16);
  --page:var(--cream); --text:var(--ink); --muted:var(--ink-soft);
  --rule:var(--hairline); --accent:var(--rust); --card:#ffffff;
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  --mono:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
@media (prefers-color-scheme: dark) {
  :root { --page:#1d1915; --text:#f3ede3; --muted:#9a9086; --rule:rgba(243,237,227,0.16); --accent:#d97a4e; --card:#241f1a; }
}
:root[data-theme="dark"] { --page:#1d1915; --text:#f3ede3; --muted:#9a9086; --rule:rgba(243,237,227,0.16); --accent:#d97a4e; --card:#241f1a; }
:root[data-theme="light"] { --page:var(--cream); --text:var(--ink); --muted:var(--ink-soft); --rule:var(--hairline); --accent:var(--rust); --card:#ffffff; }

body { background:var(--page); color:var(--text); font-family:var(--serif); line-height:1.55; }
.wrap { max-width:1080px; margin:0 auto; padding:56px 24px 96px; display:flex; flex-direction:column; gap:56px; }

h1 { font-size:2.1rem; line-height:1.15; text-wrap:balance; font-weight:600; letter-spacing:-0.01em; }
h2 { font-family:var(--mono); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.14em; color:var(--muted); font-weight:600; }
h3 { font-size:1.3rem; font-weight:600; display:flex; align-items:baseline; gap:12px; }
h4 { font-family:var(--mono); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); font-weight:600; margin-bottom:14px; }
p { max-width:64ch; }
.lede { font-size:1.05rem; color:var(--muted); }
.mono { font-family:var(--mono); }

.head { display:flex; flex-direction:column; gap:16px; border-bottom:1px solid var(--rule); padding-bottom:32px; }
.eyebrow { font-family:var(--mono); font-size:0.68rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--accent); }

section { display:flex; flex-direction:column; gap:20px; }
.sec-hd { display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--rule); padding-top:24px; }

table { border-collapse:collapse; font-family:var(--mono); font-size:0.8rem; font-variant-numeric:tabular-nums; }
.facts td, .facts th { padding:7px 18px 7px 0; text-align:left; border-bottom:1px solid var(--rule); }
.facts th { font-weight:600; }
.facts .out { color:var(--accent); }
.scroll { overflow-x:auto; }

.ladder { width:100%; }
.ladder th { font-family:var(--mono); font-size:0.72rem; font-weight:500; color:var(--muted); text-align:left; padding-right:16px; white-space:nowrap; }
.ladder td { padding:10px 12px; text-align:center; }
.ladder thead td { color:var(--muted); font-size:0.68rem; }
.px { font-family:var(--mono); font-size:0.66rem; color:var(--muted); }
.glyph { display:inline-flex; }

.panel { background:var(--card); border:1px solid var(--rule); border-radius:2px; padding:20px; }
.dir { display:flex; flex-direction:column; gap:18px; border-top:1px solid var(--rule); padding-top:28px; }
.dir-hd { display:flex; flex-direction:column; gap:6px; }
.dir-id { font-family:var(--mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--accent); border:1px solid var(--rule); padding:3px 7px; border-radius:2px; }
.dir-motion { font-family:var(--mono); font-size:0.7rem; }
.dir-motion .ok { color:var(--muted); }
.dir-motion .no { color:var(--accent); }
.dir-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:18px; }

.dir-big { display:flex; gap:12px; flex-wrap:wrap; }
.big { flex:1 1 180px; background:#211c19; border-radius:2px; padding:22px; display:flex; flex-direction:column; align-items:center; gap:14px; }
.big figcaption { font-family:var(--mono); font-size:0.68rem; color:#d6d1c9; display:flex; flex-direction:column; align-items:center; gap:2px; }
.big figcaption span { color:#8a8177; font-size:0.62rem; }

.tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
.tile { background:var(--bg); border:1px solid var(--rule); border-radius:2px; padding:14px; display:flex; flex-direction:column; gap:12px; }
.tile-hd { display:flex; flex-direction:column; gap:1px; font-family:var(--mono); }
.tile-name { font-size:0.7rem; color:var(--fg); }
.tile-note { font-size:0.62rem; color:var(--soft); }
.strip { display:flex; align-items:center; gap:22px; padding:10px 2px; }
.tile--situ { padding:0; gap:0; }
.tile--situ .tile-hd { padding:14px 14px 8px; }

.sidebar { display:flex; flex-direction:column; }
.row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px 14px; font-family:var(--mono); font-size:0.78rem; color:var(--fg); background:var(--panel); }
.row--quiet { background:transparent; }
.row-name { white-space:nowrap; }
.row-counts { display:flex; align-items:center; gap:10px; }
.counter { display:inline-flex; align-items:center; gap:4px; font-size:0.69rem; font-weight:700; font-variant-numeric:tabular-nums; }

.align { border:1px solid var(--rule); border-radius:2px; overflow:hidden; }
.align-group { display:grid; grid-template-columns:132px 1fr; align-items:center; gap:14px; padding:10px 16px; font-family:var(--mono); border-bottom:1px solid rgba(243,237,227,0.09); }
.align-group:last-child { border-bottom:0; }
.align-group--base { background:rgba(227,179,65,0.07); }
.align-lines { display:flex; flex-direction:column; gap:2px; }
.align-line { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:4px 8px; border-radius:2px; background:rgba(243,237,227,0.045); }
.align-line--quiet { background:transparent; }
.align-id { font-size:0.62rem; letter-spacing:0.08em; color:#e3b341; display:flex; flex-direction:column; gap:1px; }
.align-id em { font-style:normal; color:#8a8177; letter-spacing:0; }
.align-name { font-size:0.76rem; color:#d6d1c9; }
.align-counts { display:flex; }
.align-cell { width:46px; display:flex; align-items:center; justify-content:center; border-left:1px solid rgba(243,237,227,0.13); }
.align-counts .align-cell:last-child { border-right:1px solid rgba(243,237,227,0.13); }

.grid { display:grid; grid-template-columns:var(--cols); background:#211c19; border:1px solid var(--rule); border-radius:2px; min-width:min-content; }
.grid-row { display:grid; grid-column:1 / -1; grid-template-columns:subgrid; align-items:center; border-bottom:1px solid rgba(243,237,227,0.09); }
.grid-row:last-child { border-bottom:0; }
.grid-row--head { align-items:end; }
.grid-row--base { background:rgba(227,179,65,0.06); }
.grid-cell { padding:12px 14px; font-family:var(--mono); font-size:0.66rem; color:#d6d1c9; display:flex; flex-direction:column; gap:2px; justify-content:center; }
.grid-cell b { font-weight:600; }
.grid-cell span { color:#8a8177; font-size:0.6rem; }
.grid-cell--rowhead b { color:#e3b341; font-size:0.68rem; }
.pair { display:flex; align-items:center; gap:11px; }

.adj { display:flex; flex-direction:column; gap:0; background:#211c19; border:1px solid var(--rule); border-radius:2px; overflow:hidden; }
.adj-row { display:flex; align-items:center; gap:20px; padding:14px 18px; border-bottom:1px solid rgba(243,237,227,0.09); flex-wrap:wrap; }
.adj-row:last-child { border-bottom:0; }
.adj-label { font-family:var(--mono); font-size:0.72rem; color:#d6d1c9; min-width:150px; }
.adj-cells { display:flex; gap:26px; align-items:flex-end; }
.adj-cell { display:flex; flex-direction:column; align-items:center; gap:6px; }
.adj-pair { display:inline-flex; align-items:center; gap:9px; }
.adj-cell .px { color:#8a8177; }

.retired { display:flex; flex-direction:column; gap:6px; font-family:var(--mono); font-size:0.7rem; list-style:none; border-left:2px solid var(--rule); padding-left:16px; }
.retired li { color:var(--muted); }
.retired b { color:var(--accent); font-weight:600; }
.retired span { display:block; font-size:0.66rem; }

.size-hd { margin-top:22px; }
.size-row { display:flex; flex-wrap:wrap; gap:10px; background:#211c19; border:1px solid var(--rule); border-radius:2px; padding:20px 16px; }
.size-cell { flex:1 1 110px; display:flex; flex-direction:column; align-items:center; gap:10px; justify-content:flex-end; }
.size-cell figcaption { font-family:var(--mono); font-size:0.66rem; color:#d6d1c9; text-align:center; display:flex; flex-direction:column; gap:2px; }
.size-cell figcaption span { color:#8a8177; font-size:0.6rem; }

.ctrl-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin-bottom:14px; }
.ctrl { background:#211c19; border:1px solid transparent; border-radius:2px; padding:20px 16px; display:flex; flex-direction:column; align-items:center; gap:14px; }
.ctrl--grid { border-color:#34d399; }
.ctrl-states { display:flex; gap:26px; }
.ctrl-state { display:flex; flex-direction:column; align-items:center; gap:7px; }
.ctrl-state .px { color:#8a8177; }
.ctrl figcaption { font-family:var(--mono); font-size:0.68rem; color:#d6d1c9; text-align:center; display:flex; flex-direction:column; gap:2px; }
.ctrl figcaption span { color:#8a8177; font-size:0.62rem; }

.tone-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.tone-group:last-child { margin-bottom:0; }
.tone-group h5 { font-family:var(--mono); font-size:0.64rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); font-weight:600; }
.tone-row { display:flex; gap:8px; border-radius:2px; padding:16px 12px; }
.tone { flex:1; display:flex; flex-direction:column; align-items:center; gap:9px; }
.tone figcaption { font-family:var(--mono); font-size:0.62rem; color:#8a8177; }

/* One mark, alone. The card mock is the real TaskCard chrome, read off the
   running desktop app: bg-surface-raised #2a2320, border-edge #463e38, radius 6,
   p-2.5, a 14px/500 title and a 12px mono ID badge. */
.iso-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:18px; }
.iso { display:flex; flex-direction:column; gap:14px; background:#211c19; border:1px solid var(--rule); border-radius:2px; padding:20px 18px; }
.iso--control { border-color:#8a8177; }
.iso--shipped { border-color:#e3b341; }
.iso-card { width:100%; max-width:272px; background:#2a2320; border:1px solid #463e38; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:4px; }
.iso-hd { display:flex; align-items:center; gap:6px; }
.iso-title { font-family:ui-sans-serif,system-ui,sans-serif; font-size:14px; font-weight:500; color:#e6e2de; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
.iso-badge { flex-shrink:0; font-family:var(--mono); font-size:12px; color:#8a8177; }
.iso-desc { font-family:ui-sans-serif,system-ui,sans-serif; font-size:12px; color:#7d746a; line-height:1.45; margin:0; max-width:none; }
.iso-tip { display:inline-flex; align-items:center; gap:6px; font-family:ui-sans-serif,system-ui,sans-serif; font-size:12px; color:#7d746a; }
.iso figcaption { font-family:var(--mono); font-size:0.68rem; color:#d6d1c9; display:flex; flex-direction:column; gap:3px; margin-top:auto; }
.iso figcaption span { color:#8a8177; font-size:0.62rem; }
.iso-name { display:flex; align-items:center; gap:8px; }
.iso-name b { color:#d6d1c9; font-size:0.68rem; font-weight:600; }
.iso-tag { padding:1px 6px; border-radius:2px; font-size:0.56rem; letter-spacing:0.06em; text-transform:uppercase; }
.iso-tag--prod { background:rgba(138,129,119,0.22); color:#c9c2b8; }
.iso-tag--ship { background:rgba(227,179,65,0.18); color:#e3b341; }
.recog { display:inline-flex; }

/* The lattice band. Glyphs at TRUE size, three in a row: a single 14px mark is
   hard to read a smeared edge off, a short run of them is not. No transform, no
   zoom, no canvas - whatever scaling were applied here would re-rasterize the
   vector and show something other than what the consumer paints. */
.lat { display:inline-flex; align-items:center; gap:6px; }
.lat-ok { color:#34d399; }
.lat-soft { color:#e3b341; }
.grid-cell--band { background:rgba(52,211,153,0.07); }

.grid-cell--flap { align-items:center; gap:7px; }
.deg { font-family:var(--mono); font-size:0.6rem; color:#8a8177; }

.motion-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; }
.motion-cell { background:#211c19; border-radius:2px; padding:22px; display:flex; flex-direction:column; align-items:center; gap:14px; }
.motion-cell figcaption { font-family:var(--mono); font-size:0.68rem; color:#d6d1c9; text-align:center; display:flex; flex-direction:column; gap:3px; }
.motion-cell figcaption span { color:#8a8177; font-size:0.62rem; max-width:24ch; }

.bar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; font-family:var(--mono); font-size:0.72rem; }
button { font:inherit; color:var(--text); background:var(--card); border:1px solid var(--rule); border-radius:2px; padding:6px 12px; cursor:pointer; }
button[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fdfbf7; }
button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

.note { font-family:var(--mono); font-size:0.72rem; color:var(--muted); max-width:70ch; }
.note b { color:var(--accent); font-weight:600; }
body.frozen .kng-march, body.frozen .kng-spin { animation-play-state:paused; }
body.rest-preview .kng-march, body.rest-preview .kng-spin { animation:none; }
body.rest-preview svg[data-rest="drop-dash"] > * { stroke-dasharray:none; }
@media (prefers-reduced-motion: reduce) { .kng-march, .kng-spin { animation:none; } }
`;

const html = `<title>Activity icon set: candidate directions</title>
<style>
${motionCss()}
${CSS}
</style>
<div class="wrap">

  <header class="head">
    <span class="eyebrow">kangentic-branding / review</span>
    <h1>${LIVE.length === 1 ? `The activity icon set: ${LIVE[0].label}` : `The activity icon set, ${LIVE.length} directions`}</h1>
    <p class="lede">Agent and terminal status marks are stock library defaults on every surface today. Their ink boxes disagree, so a project sidebar row sits unevenly.${
      LIVE.length === 1
        ? ` Nine directions were drawn and eight retired; this is the one that survived, shown against what ships today.`
        : ` Pick a direction from this page and the rest of the work follows it.`
    }</p>
    ${
      LIVE.length === 1
        ? `<p class="note">Selected on the criterion that eliminated every other candidate: the needs-you mark has to be construable, at a glance, as <b>that agent finished and there is something here for you</b>. Grid parity, adjacency and colourblind redundancy can only rule directions out. Meaning is what picks one, and the envelope is the only mark in the field that carries it.</p>`
        : ""
    }
    <div class="scroll"><table class="facts">
      <thead><tr><th>Mark today</th><th>stock ink</th><th>at ${ROW_SIZE}px</th></tr></thead>
      <tbody>
        <tr><td>Mail, needs you</td><td class="out">20 x 16</td><td class="out">11.67 x 9.33</td></tr>
        <tr><td>LoaderCircle, working</td><td>18 x 18</td><td>10.50 x 10.50</td></tr>
        <tr><td>Command Terminal chip</td><td>18 x 18</td><td>10.50 x 10.50</td></tr>
      </tbody>
    </table></div>
    <p class="note">The aspect ratios do not match, so scaling cannot reconcile them. Every mark in the set is redrawn on a ${VIEW} viewBox at stroke ${STROKE}, currentColor only, filling an ${INK_BOX} x ${INK_BOX} ink box. <b>The envelope is the one mark where that last clause is under review</b>, and the section below is why.</p>
    <p class="note">On area, corrected. This page used to argue from enclosed area, which for a <b>stroked</b> glyph is the wrong measure: optical weight is ink length times stroke width. Measured rather than asserted, in grid units: the shipped square envelope carries <b>${deg(envelopeInk("square"))}</b> of ink, the 1.25-aspect candidate <b>${deg(envelopeInk("mail"))}</b>, the terminal chip <b>${deg(chipInk())}</b>, the ring <b>${deg(ringInk())}</b>. By area the shorter envelope looks 20 percent light; by ink it lands within 5 percent of the chip, and the <b>square one is the outlier</b>, ${Math.round(((envelopeInk("square") - chipInk()) / chipInk()) * 100)} percent heavier than its own neighbour.</p>
    <div class="bar">
      <button id="freeze" aria-pressed="false">Freeze motion</button>
      <button id="rest" aria-pressed="false">Preview reduced motion</button>
      <span class="note">Theme follows your system; the host toggle overrides it.</span>
    </div>
  </header>

  <section>
    <div class="sec-hd">
      <h2>One mark, alone</h2>
      <p>Read this section first, and read it before anything else on this page. Every other cell here is comparative <b>by construction</b>: stacked rows, adjacency pairs, counters in fixed cells against a hairline datum. That is the right instrument for an ink-box question and the wrong one for a recognition question, because a mark that only fails with nothing beside it has no cell that can see it.</p>
      <p>The board renders <b>one</b> mark on a card. Below is that card, with the real chrome read off the running desktop app, carrying one envelope and no sibling glyph, at the ${CARD_SIZE}px the task card actually uses. Beneath each is the activity tooltip at ${TOOLTIP_SIZE}px.</p>
      <p class="note">The previous round asserted this view would be uninformative, and used that assertion to justify not building it: <b>"a redrawn envelope looks almost identical to the stock one on its own, because what changed is the ink box, and an ink box is only visible next to another one."</b> That claim is what shipped a mark nobody had looked at alone.</p>
      <p class="note"><b>Acceptance test for this section.</b> It has to make the <b>shipped</b> envelope look wrong. If <span class="mono">square</span> renders here and reads fine, then the mock is not faithful and the fix is the mock, not the criterion. The failure is real and there is a live screenshot of it, so a clean <span class="mono">square</span> cell is evidence of a bad mock, never evidence that the re-review was unnecessary.</p>
    </div>
    ${isolationSection()}
    <p class="note">The same six glyphs, each alone, down the sizes each one actually renders at. Adjacency is wanted here, because you cannot judge whether something reads as mail without something to read it against, but there is <b>no alignment datum and no sibling mark from the set</b> in any cell. ${LEGIBILITY_FLOOR_PX}px is not optional: absolute flap depth drops from ${flapVariant("standard", "square").depth} to ${flapVariant("standard", "mail").depth} on the shortest box, so that is where the V could merge into the top edge.</p>
    ${recognitionLadder()}
    <p class="note">Note on the failing size, corrected 2026-07-31. This used to read that the sidebar had been bumped ${ROW_SIZE} to 16 "while the task card stayed at 14". The task card is at <b>16</b>, and was already, so the sentence described a split that had closed. What the record actually missed is <b>15</b>: three desktop surfaces render indicators at it and this repo had no ladder rung, no size strip and no isolation row for it until now. The ladder covers every case; no single cell above should be read as <em>the</em> reproduction.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>The pixel lattice, at ${INDICATOR_SIZES.join(" / ")}</h2>
      <p>Everything above judges <b>shape</b>. This section judges where that shape's edges land on the <b>device pixel grid</b>, which is a different question and the one behind the report that these marks read softer than the library glyphs beside them.</p>
      <p>Stroke ${STROKE} on a ${VIEW} grid renders <span class="mono">${STROKE} * px / ${VIEW}</span> device pixels: <b>${INDICATOR_SIZES.map((s) => (STROKE * s / VIEW).toFixed(3)).join("</b>, <b>")}</b> at ${INDICATOR_SIZES.join(", ")}. None is an integer, so at no size in this band can a coordinate put <b>both</b> stroke edges on pixel boundaries. That is arithmetic, not a defect, and it is equally true of every other ${VIEW}-grid icon set in the row.</p>
      <p>What a coordinate does control is where its two stroke EDGES land. An edge sitting exactly on a pixel boundary leaves no partial pixel at all, which is what "hard" looks like; one sitting dead centre between boundaries leaves the greyest possible. So the hint is a lattice, not a stroke weight.</p>
      <p class="note"><b>Display scaling is part of the question, and leaving it out was this round's first wrong turn.</b> Everything above reasons in DEVICE pixels, but a consumer sizes an icon in CSS pixels, and the two are equal only at a <span class="mono">devicePixelRatio</span> of 1. Windows ships 125% and 150% as common defaults; every Mac panel is 2x. It changes the answer: at <b>1.5x</b> a 16px render is scale 1.0 with a stroke of exactly 2.0 device px, so every integer coordinate is <b>perfectly</b> hard and the shipped box is the only soft one - while at <b>1.25x</b> and <b>2x</b> the shipped box is the sharpest candidate in several cells. The table below is a matrix for that reason. <b>Check your own display before reading it</b>; a maintainer judging the specimens on a 1.5x panel is looking at a case where several candidates are provably identical.</p>
      <p class="note"><b>How to read this section.</b> The glyphs below are real inline SVG at <b>true</b> 14, 15 and 16 in this page, rendered by the browser you are reading this in - the same engine Electron and the website paint with. Nothing here is scaled, zoomed or drawn through a canvas, because any of those would re-rasterize the vector and show you something other than what a consumer sees. Three copies per cell, because a smeared edge is easier to catch in a short run than in one lone glyph. For the magnified view, use <span class="mono">_isolation-zoom-*.png</span> and mind its caption: that sheet is librsvg at 1x, not Chromium.</p>
    </div>
    ${latticeSpecimens()}
    <p class="note">The same candidates as numbers, across every display scaling. <span class="mono">softness</span> is the mean greyness of a box's two stroke edges: <b>0.000</b> means both land exactly on pixel boundaries, higher is softer. Measured by <span class="mono">strokeCoverage()</span> in the lib, never asserted here. Green marks the sharpest candidate in each column.</p>
    <p class="note"><b>On the metric, because two earlier ones were wrong and the corrections are the useful part.</b> This first ranked by <span class="mono">core</span>, the largest single covered pixel row - which SATURATES: past about a 2px device stroke every candidate scores 1.000, so it reported "no difference" on exactly the high-scaling displays where there still was one. The replacement measured the fraction of ink in fully covered rows, which is worse: a step function whose output swings from 0 to 0.8 on a 0.083 change in coverage, so it ranked candidates by how often they landed on an exact integer. Both would have picked a different winner. <span class="mono">softness</span> is continuous, has no threshold, and means the same thing at every scaling.</p>
    ${latticeTable()}
    <p class="note">Read the <span class="mono">production</span> row first, because it is the one that reframes this. A 20 x 16 box centred on ${VIEW} sits at <b>y 4 and y 20</b>. <b>The stock glyph this set replaced was already on the lattice, and the redraw took it off.</b> The 0.9 scale that fixed the aspect and restored the ${angleOf(FLAP_DEFAULT, "mail")} degree flap landed the box on 4.8 and 19.2 - off the lattice at every scaling but one, since 4.8 x 1.25 = 6.0 is the sole exception. The set was built to fix an ink-box disagreement and traded away a hinting property nobody had named.</p>
    <p class="note">Two honest caveats on the totals. First, a total is a summary: <span class="mono">between</span> wins it while still losing individual cells to the shipped box at 1.25x and 2x, so a maintainer on one of those displays should read the cells rather than the total. Second, every candidate here is an <b>indicator box</b>; the flap is two diagonals and the ring is a curve, and both anti-alias wherever their coordinates sit, so no amount of hinting touches them.</p>

    <div class="sec-hd">
      <h3>The slot, and why it is a separate decision</h3>
      <p>Every indicator in this set spans <b>x ${slotBox(SLOT_DEFAULT).min} to ${slotBox(SLOT_DEFAULT).max}</b>, and its landmarks are 3, 9, 12 and 21 - all divisible by 3. Measured across every scaling and size, <b>the slot is the softest coordinate in the whole field</b>, behind even the envelope box this round opened on. So if the report is about the set rather than about the envelope alone, this is the bigger cause - and much the more expensive thing to move.</p>
      <p class="note">This band is <b>information, not a promotable cell</b>. The slot is <span class="mono">INK_BOX</span>, which <span class="mono">lib/ui-glyphs.mjs</span> imports rather than restating, so moving it regenerates <span class="mono">assets/ui/kanban.svg</span> and the <span class="mono">resources/mobile/kanban-tab-*</span> rasters - and <span class="mono">ui-glyph-geometry.md</span> records that those are keyed to the iOS tab bar and that changing them invalidates the store screenshots captured against them. It also shrinks every indicator by 11%, which is a legibility judgement rather than a hinting one. A win on the envelope must not silently commit this.</p>
    </div>
    ${slotBand()}

    <div class="sec-hd">
      <h3>The ${SMALL_MASTER.view}-unit master the brief prescribed</h3>
      <p>A second master authored on a ${SMALL_MASTER.view} grid, so a 16px render is scale 1 and lands exactly. Built as a lattice-snapped 2/3 scale of the shipped drawing, so this compares <b>masters</b> and not two different designs.</p>
      <p>At stroke 2 it renders <b>2.000</b> device px at size 16: genuinely exact, and <b>50% heavier</b> than the ${(STROKE * 16 / VIEW).toFixed(3)}px library glyphs beside it, which stay on their own ${VIEW} grid. At stroke 1.5 the weight is close but 1.5 is an <b>odd half-width</b>, so its edges cannot both be integers at any centreline and exactness is off the table anyway. Neither helps 14 or 15.</p>
      <p class="note">The last row is the shipped ${VIEW}-grid ring at the same three sizes, on the same pitch, so the weight difference is side by side rather than a paragraph away. That comparison is the whole objection to this direction, and it should be settled by looking rather than by the arithmetic above.</p>
    </div>
    ${smallMasterBand()}
  </section>

  <section>
    <div class="sec-hd">
      <h2>The envelope's box, and the flap angle that rides with it</h2>
      <p>The set exists because the stock marks disagreed: the loader and the terminal filled ${INK_BOX} x ${INK_BOX}, the mail filled 20 x 16. The fix was to redraw on one box. What that round did not separate is that the mail was two things at once, <b>wider and shorter</b>, and only the width was ever costing anything. Ink <b>width</b> is what aligns the tabular counter column, because the ring's diameter is ${INK_BOX} and the chip is ${INK_BOX} wide. Height contributes nothing to that column.</p>
      <p>So the candidates below hold width at ${INK_BOX} and vary height, except <span class="mono">stock</span>, which is the reference box drawn on this set's construction and the <b>only</b> candidate that moves the column at all. Without it there is no evidence either way about whether the alignment win is worth its cost.</p>
    </div>
    ${boxSpecimens()}
    <p class="note">Every number that decides this is printed rather than asserted. Aspect, flap angle, flap depth, and ink length in grid units.</p>
    ${boxAlignmentBand()}
    <p class="note">The alignment instrument, applied to the candidates: counters in fixed cells with a hairline datum. Only <span class="mono">stock</span> should move the column, because only <span class="mono">stock</span> is not ${INK_BOX} wide. Every ${INK_BOX}-wide candidate keeps the column the set was built to fix, whatever its height.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>Why the box and the flap are one decision</h2>
      <p>Flap ratios are fractions of the box, so transplanting them onto a box of a different aspect does <b>not</b> carry the angle across: the half-width moves with the width and the depth moves with the height. The angle is <span class="mono">2*atan((w/2)/depth)</span>, and it is what the eye actually reads.</p>
      <p class="note">This is the coupling the last round missed. It recorded that the selected flap "takes the reference glyph's flap ratios and puts them on this set's ${INK_BOX} x ${INK_BOX} box, so the angle is the reference's and the ink box is ours." The ratios carried; the angle did not. The reference glyph's V is <b>${angleOf(FLAP_DEFAULT, "stock")} degrees</b>; the same ratios on the square box give <b>${angleOf(FLAP_DEFAULT, "square")} degrees</b>, which is ${(flapVariant(FLAP_DEFAULT, "stock").angle - flapVariant(FLAP_DEFAULT, "square").angle).toFixed(1)} degrees pointier and sits only ${(flapVariant(FLAP_DEFAULT, "square").angle - flapVariant("deep", "square").angle).toFixed(1)} degrees off <span class="mono">deep</span>, the draft that same round rejected as too pointy. Read a row across the table below and watch one named flap become three different Vs.</p>
    </div>
    ${flapCouplingTable()}
    <p class="note">Two things fall out. A uniform scale preserves angles, so the ${INK_BOX} x ${envelopeBox("mail").h} candidate is the reference glyph at 0.9 and lands back on <b>${angleOf(FLAP_DEFAULT, "mail")} degrees</b> for free. And the 2026-07-28 target of "depth 6 to 6.5" was set on an ${INK_BOX}-tall box and does not transfer: on a shorter box the same angle wants a shallower depth, so holding depth constant across boxes is holding the wrong number.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>Every direction as the project panel would render it</h2>
      <p>Two project rows per direction, at ${ROW_SIZE}px, with the counts that are always beside these marks in the real sidebar. Two rows because the Command Terminal aggregates to <b>one tone per project</b>: the first project's terminal is amber and still, the second's is green and marching, so both terminal states are on screen at once the way the real sidebar shows them. The top pair is what ships today. Each counter sits in a fixed cell with a hairline datum, so a glyph that is wider or shorter than its neighbours has nowhere to hide.</p>
    </div>
    ${alignmentBand()}
    <p class="note">This band measures one thing well: whether the counters line up. It cannot see a recognition failure, because every glyph in it has a neighbour and a datum. That is not a flaw in the band, it is its scope. <b>The claim that used to sit here</b> - that an ink box is only visible next to another one, so a mark alone is uninformative - generalised this band's scope into a reason not to look at a mark alone. It is wrong, and the section at the top of this page is what replaces it.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>The tests that can kill a direction</h2>
      <p>There are two adjacencies, not one. <b>Idle renders beside working</b> in every row where a project has both, so those two have to be told apart first. Then the pair has to stay clear of the <b>Command Terminal chip</b>, which lands in the same row roughly 22px away. Every cell below is at ${ROW_SIZE}px, the size the sidebar actually renders.</p>
      <p>The second adjacency is a meaning test, not a legibility one. A board agent is persistent and bound to a task; a Command Terminal is ephemeral and bound to a project. Those are different objects with different lifetimes, so a direction that lets one wear the other's silhouette leaves the row unreadable no matter how the colours land. The last column is that test at its hardest: both marks working, so both are green and both are marching, and only the interior is left to tell them apart.</p>
      <p>The last two conditions are the ones that decide it. <b>Motion off</b> removes the marching dash; <b>shape alone</b> removes the colour too. A direction that goes blank in either column is carrying its state on one channel. Every cell is the same size, including the controls column, so what is being judged is the drawing rather than the placement.</p>
    </div>
    ${adjacencyTable()}
    <p class="note">A pair that is still two marks in the <b>shape alone</b> column works for every viewer, in every motion setting, on every theme. A pair that collapses there is relying on colour, and #e3b341 against #34d399 is exactly the pair that converges under deuteranopia.</p>
    <div class="adj">${ALL.map(adjacencySizes).join("")}</div>
    <p class="note">The agent against the terminal, down the ladder, both in <b>needs-you amber</b>. Read the ${ROW_SIZE}px column first.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>The controls this set has to live with</h2>
      <p>The task-detail <b>pause</b> button and the Command Terminal <b>stop</b> button are already a ring with a solid centred glyph, tinted by these same two tokens: amber and still for needs-you, green and spinning for working. They are not candidates. They are the constraint, and a round agent mark has to be judged sitting next to them.</p>
    </div>
    ${controlsSection()}
    <p class="note">Three things this settles. The controls spin a ring dashed <span class="mono">47 16</span>, which on a circumference of 62.83 is <b>74.8 / 25.2</b>: the app already picked the 3/4 chasing arc by hand, in two files, as a magic pair that breaks silently if the ring size changes. That is the drift this package exists to stop. A rotating dashed circle and a marching dashed circle are <b>visually identical</b>, so unifying on the march primitive costs these controls nothing on screen. And they use r=10, not this set's ${INK_BOX} ink box, deliberately, because lucide's Loader2 at r=9 "rendered ~10% smaller" beside them.</p>
    <p class="note">The risk this creates is specific: <b>D4b's idle mark is a ring with a filled centre, and the stop control is a ring with a filled centre.</b> One is an indicator with a count, the other is a button in a header, but they are the same drawing. D4c's double ring and D1's envelope have no such collision. D7 collides with the pause control <b>deliberately</b>, which is a different thing from colliding with it by accident.</p>
    <p class="note">On the size strip: the controls render at ${CONTROL_RENDER_PX}px and the row indicators at ${ROW_SIZE}px because a header button is a target and a row indicator is a label. That is placement, not geometry. The drawing is identical at every size on that strip, which is the whole reason one ink box is worth having.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>Motion</h2>
      <p>The Command Terminal already carries state without changing shape: colour plus a dash marching around its own border, normalized by <span class="mono">pathLength="100"</span> so the dash math is geometry independent. The question is whether the working state joins it or keeps the rotating arc it uses today.</p>
    </div>
    ${motionSection()}
    <p class="note">Rotation is only coherent on a radially symmetric mark. <b>D2a, D2b and D3 cannot use it</b>: rotating an envelope or a chip is a tilt, not motion. Picking one of those picks the marching dash with it. Marching also removes the rotation transform on mobile entirely, which is what the frozen tilted-envelope guard in <span class="mono">AgentStatusIcon</span> exists to work around.</p>
    <p class="note">Portability, found while building this page: browsers honour <span class="mono">pathLength</span> on every shape, but <b>librsvg and react-native-svg do not reliably</b>, and a dash there silently falls back to user units, which on a 56 unit circle means a "75" dash covers the whole ring and the motion disappears. The geometry lives in one place, so it hands every runtime the number it can use. Resolved dashes: spinner ring <span class="mono">${dashInUserUnits(d1.marks[1])}</span>, terminal chip <span class="mono">${dashInUserUnits(d1.marks[2])}</span>.</p>
  </section>

  <section>
    <div class="sec-hd">
      <h2>At rest</h2>
      <p>Reduced motion is a rendering, not a mute button, and stopping a marching dash does not land the same way on every silhouette.</p>
    </div>
    ${restSection()}
  </section>

  <section>
    <div class="sec-hd">
      <h2>${LIVE.length === 1 ? "The set" : "The directions"}</h2>
      <p>The first band is what ships today, unchanged, as the control.</p>
      ${RETIRED.length ? `<p class="note">Retired at review, all still declared in <span class="mono">lib/activity.mjs</span> with their reasons so the decisions are recorded rather than rediscovered:</p><ul class="retired">${RETIRED.map(
        (d) => `<li><b>${d.id.toUpperCase()}</b> ${d.label} <span>${esc(d.retired.replace(/^[\d-]+: ruled out at review - /, ""))}</span></li>`,
      ).join("")}</ul>` : ""}
    </div>
  </section>

  ${ALL.map(directionSection).join("")}

  <section>
    <div class="sec-hd">
      <h2>Notes</h2>
    </div>
    <p class="note">Marks ship as <b>currentColor</b> only, so each surface applies its own tokens. Desktop is #e3b341 and #34d399, mobile is #d9b83f and #3ddc84, the website is #d98324 and #218a4c. The geometry never sees a hex.</p>
    <p class="note">Envelope flap: <b>${FLAP_DEFAULT}</b>, on the shipped box depth ${flapVariant(FLAP_DEFAULT, "square").depth}, vertex <b>${angleOf(FLAP_DEFAULT, "square")} degrees</b>, settled 2026-07-28 from a six-variant study. <b>Corrected 2026-07-29:</b> that round recorded this as taking the reference glyph's flap ratios onto this set's ${INK_BOX} x ${INK_BOX} box "so the angle is the reference's and the ink box is ours". The ratios carried; the angle did not, because the box changed in both dimensions. The reference V is ${angleOf(FLAP_DEFAULT, "stock")} degrees and the shipped one is ${angleOf(FLAP_DEFAULT, "square")}, which is only ${(flapVariant(FLAP_DEFAULT, "square").angle - flapVariant("deep", "square").angle).toFixed(1)} degrees off <span class="mono">deep</span> - the draft that same round rejected as a downward arrow rather than a flap. The rejected variants stay declared in <span class="mono">lib/activity.mjs</span>.</p>
    <p class="note">The set is <b>five marks</b>: two agent indicators, the terminal indicator, and the two controls. The controls were never candidates. They are the rest of the family, and they come in for the same reason the indicators do: the <span class="mono">47 16</span> dash they carry today is hand-computed and duplicated across two desktop files, so it breaks silently the moment the radius changes. On this set's grid that becomes the same pathLength 75/25 every other mark uses.</p>
    <p class="note">Two floors, not one. Indicators bottom out at <b>${LEGIBILITY_FLOOR_PX}px</b>; the <b>controls bottom out at ${CONTROL_FLOOR_PX}px</b>, because their centred glyph gets a fraction of an already small box and the pause bars merge into a single dot below that. Both render comfortably above their floor today, at ${ROW_SIZE} and ${CONTROL_RENDER_PX}.</p>
    <p class="note">The legibility floor for indicators is <b>${LEGIBILITY_FLOOR_PX}px</b>. Below it the ${STROKE}px stroke falls under one device pixel and the glyph smears, so a consumer rendering smaller uses a dot. The desktop terminal panel already renders at 8px and stays a dot.</p>
    <p class="note">On state channels, more precisely than I put it first time round. #e3b341 and #34d399 converge under deuteranopia, so colour alone is not enough. <b>Motion is a real second channel</b> and every one-silhouette direction has it, but it costs time to observe and it disappears entirely under reduced motion. Only a <b>static</b> difference is always present, and which directions have one falls straight out of their rest rendering, so this list is computed from the geometry rather than written down. Has one: <b>${ids(LIVE.filter(hasStaticChannel))}</b>. Has none: <b>${ids(LIVE.filter((d) => !hasStaticChannel(d)))}</b>. For the second group the working mark has to drop its dash at rest, because a frozen 65/35 outline reads as torn, and dropping it lands on exactly the idle shape. With motion off they are one silhouette in two hues, and that is structural rather than a tuning problem. The <b>shape alone</b> column above is this same fact, rendered.</p>
  </section>

</div>
<script>
  const freeze = document.getElementById("freeze");
  const rest = document.getElementById("rest");
  const toggle = (btn, cls) => btn.addEventListener("click", () => {
    const on = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle(cls, on);
  });
  toggle(freeze, "frozen");
  toggle(rest, "rest-preview");
</script>
`;

const file = join(OUT, "compare.html");
await writeFile(file, html);
console.log(`Wrote ${LIVE.length} live directions + baseline -> exploration/activity/compare.html`);

// ---------------------------------------------------------------------------
// The shipped set. Everything above is a review artifact under exploration/;
// everything below lands in assets/ and is held to byte determinism by the
// release gate. One mark, one file, named exactly as its id.
// ---------------------------------------------------------------------------

const SHIP = join(ROOT, "assets", "activity");
await mkdir(SHIP, { recursive: true });

for (const m of SET_MARKS) {
  // Emitted at the natural 24 with the dash and the motion class already on it,
  // so a consumer that loads activity.css gets the correct animated mark with no
  // assembly. width/height are presentation attributes, so CSS or an SvgXml prop
  // overrides them for any surface that needs a different size.
  await writeFile(join(SHIP, fileFor(m)), markSvg(m, { size: VIEW }) + "\n");
}
await writeFile(join(SHIP, "activity.css"), motionCss() + "\n");
await writeFile(join(SHIP, "activity.json"), JSON.stringify(manifest(), null, 2) + "\n");

console.log(`Wrote ${SET_MARKS.length} marks + activity.css + activity.json -> assets/activity/`);

// ---------------------------------------------------------------------------
// Size strips for the aesthetic review. Review artifacts, so exploration/, and they
// resolve each dash into user units first because librsvg ignores pathLength.
// ---------------------------------------------------------------------------

const STRIP_SIZES = [12, ...INDICATOR_SIZES, 20, 24];
const faithful = (m, size) => {
  const svg = markSvg(m, { size, resting: true });
  const abs = dashInUserUnits(m);
  return abs ? svg.replace(/stroke-dasharray="[^"]*"/, `stroke-dasharray="${abs}"`) : svg;
};
const stripInner = (s) => s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

for (const g of GROUNDS) {
  const PAD = 20;
  const LABEL = 170;
  const COL = 60;
  const ROW = 46;
  const parts = STRIP_SIZES.map(
    (s, i) => `<text x="${LABEL + i * COL + COL / 2}" y="${PAD + 12}" text-anchor="middle" font-family="monospace" font-size="10" fill="${g.soft}">${s}</text>`,
  );
  SET_MARKS.forEach((m, r) => {
    const y = PAD + 24 + r * ROW;
    parts.push(
      `<text x="${PAD}" y="${y + ROW / 2}" font-family="monospace" font-size="11" fill="${g.fg}">${m.id}</text>`,
    );
    STRIP_SIZES.forEach((s, i) => {
      const x = LABEL + i * COL + (COL - s) / 2;
      parts.push(
        `<g transform="translate(${x},${y + (ROW - s) / 2}) scale(${s / VIEW})" style="color:${toneOf(g, m)}" fill="none" stroke="${toneOf(g, m)}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${stripInner(faithful(m, s))}</g>`,
      );
    });
  });
  const W = LABEL + STRIP_SIZES.length * COL + PAD;
  const H = PAD + 24 + SET_MARKS.length * ROW + PAD;
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${g.bg}"/>${parts.join("")}</svg>`;
  await sharp(Buffer.from(doc)).png().toFile(join(OUT, `_sheet-${g.id}.png`));
}
console.log(`Wrote ${GROUNDS.length} size strips -> exploration/activity/_sheet-*.png`);

// ---------------------------------------------------------------------------
// The isolation sheet. The same instrument as the section at the top of
// compare.html, rendered to PNG so the review reads a real artifact rather
// than a re-derivation - the discipline the mobile review sheet already follows.
//
// One mark, on the real task card, with no sibling glyph and no alignment datum,
// then the same mark alone down the sizes it renders at. This is the view whose
// absence let a square envelope ship.
// ---------------------------------------------------------------------------

const isoSheet = async (g) => {
  const PAD = 22;
  const LABEL = 132;
  const CARD_W = CARD.w;
  const CARD_H = 58;
  const CELL = 48;
  const ROW = CARD_H + 20;
  const ladderX = PAD + LABEL + CARD_W + 26;
  const W = ladderX + ISO_SIZES.length * CELL + PAD;
  const H = PAD + 20 + ISO_ROWS.length * ROW + PAD;

  const glyph = (m, size, x, y, color) =>
    `<g transform="translate(${x},${y}) scale(${size / VIEW})" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${stripInner(
      markSvg(m, { size, resting: true }),
    )}</g>`;

  const parts = [
    `<text x="${PAD}" y="${PAD + 8}" font-family="monospace" font-size="10" fill="${g.soft}">one mark, alone</text>`,
    ...ISO_SIZES.map(
      (s, i) =>
        `<text x="${ladderX + i * CELL + CELL / 2}" y="${PAD + 8}" text-anchor="middle" font-family="monospace" font-size="10" fill="${g.soft}">${s}</text>`,
    ),
  ];

  ISO_ROWS.forEach((r, i) => {
    const y = PAD + 20 + i * ROW;
    const tone = g.attention;
    // The label column.
    parts.push(
      `<text x="${PAD}" y="${y + 20}" font-family="monospace" font-size="11" fill="${g.fg}">${r.id}</text>`,
      `<text x="${PAD}" y="${y + 34}" font-family="monospace" font-size="9" fill="${g.soft}">${r.box.w} x ${r.box.h}  a${r.box.aspect}</text>`,
      `<text x="${PAD}" y="${y + 46}" font-family="monospace" font-size="9" fill="${g.soft}">${r.flap.angle.toFixed(1)} deg</text>`,
    );
    // The task card, carrying exactly one mark.
    const cx = PAD + LABEL;
    const sk = cardSkin(g);
    parts.push(
      `<rect x="${cx}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="${CARD.radius}" fill="${sk.bg}" stroke="${sk.border}" stroke-opacity="${sk.borderOpacity}"/>`,
      glyph(r.mark, CARD_SIZE, cx + 10, y + 11, tone),
      `<text x="${cx + 10 + CARD_SIZE + 6}" y="${y + 22}" font-family="sans-serif" font-size="14" font-weight="500" fill="${sk.title}">Re-review the envelope</text>`,
      `<text x="${cx + CARD_W - 10}" y="${y + 22}" text-anchor="end" font-family="monospace" font-size="12" fill="${sk.desc}">#12</text>`,
      `<text x="${cx + 10}" y="${y + 43}" font-family="sans-serif" font-size="12" fill="${sk.desc}">Adopting the set surfaced a display problem.</text>`,
    );
    // The same mark alone, down the ladder.
    ISO_SIZES.forEach((s, j) => {
      parts.push(glyph(r.mark, s, ladderX + j * CELL + (CELL - s) / 2, y + (CARD_H - s) / 2, tone));
    });
  });

  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${g.bg}"/>${parts.join("")}</svg>`;
  await sharp(Buffer.from(doc)).png().toFile(join(OUT, `_isolation-${g.id}.png`));
};

for (const g of GROUNDS) await isoSheet(g);
console.log(`Wrote ${GROUNDS.length} isolation sheets -> exploration/activity/_isolation-*.png`);

// Pixel truth, per the icon-drafting review discipline: render at the target
// size and nearest-upscale, so what is being judged is the pixels the surface
// actually paints rather than a smooth vector at review size.
//
// Rebuilt 2026-07-31 to cover the WHOLE indicator band rather than one size. It
// used to render only the task card's size, and a single-size zoom cannot show
// a hinting difference at all: hinting is a statement about how a coordinate
// behaves ACROSS scales, and every candidate looks defensible at whichever one
// size you pick. The band is the instrument; one column of it is not.
//
// READ THE CAPTION ON THIS SHEET. It is rasterized by librsvg (via sharp), and
// librsvg's anti-aliasing is NOT Chromium's. The desktop app is Electron and
// the website is a browser, so the authoritative surface for these three sizes
// is the true-size band in compare.html; this sheet is the forensic view of the
// same geometry, and the two can disagree at the edges by a shade. Saying so
// here rather than letting the sheet imply otherwise is the review-artifact
// half of brand-record-fidelity.md.
const ZOOM = 8;
const zoomSheet = async (g) => {
  const CELL = Math.max(...INDICATOR_SIZES) * ZOOM;
  const GAP = 18;
  const PAD = 22;
  const LABEL = 150;
  const TOP = 66;
  const ROW = CELL + 34;
  const W = PAD * 2 + LABEL + INDICATOR_SIZES.length * CELL + (INDICATOR_SIZES.length - 1) * GAP;
  const H = TOP + ISO_ROWS.length * ROW + PAD;
  const colX = (j) => PAD + LABEL + j * (CELL + GAP);

  // The top and bottom of a row's ink box, which are the two edges the lattice
  // decides. Printed per cell so the picture and the number sit together.
  const edgesFor = (r) => (r.box.y0 === undefined ? null : [r.box.y0, r.box.y1]);

  const head =
    `<text x="${PAD}" y="18" font-family="monospace" font-size="11" fill="${g.fg}">pixel truth, the indicator band: ${INDICATOR_SIZES.join(" / ")}px, nearest-upscaled x${ZOOM}</text>` +
    `<text x="${PAD}" y="34" font-family="monospace" font-size="9" fill="${g.soft}">rasterized by librsvg, which is NOT the Chromium AA the desktop and web actually paint.</text>` +
    `<text x="${PAD}" y="46" font-family="monospace" font-size="9" fill="${g.soft}">judge from compare.html at true size; this is the forensic view of the same geometry.</text>` +
    INDICATOR_SIZES.map(
      (s, j) =>
        `<text x="${colX(j) + CELL / 2}" y="${TOP - 10}" text-anchor="middle" font-family="monospace" font-size="11" fill="${g.fg}">${s}px</text>`,
    ).join("");

  const labels = ISO_ROWS.map((r, i) => {
    const y = TOP + i * ROW;
    const e = edgesFor(r);
    // Softness at dpr 1, which is the scaling this sheet is rasterized at and
    // the only one it can honestly report. The full dpr matrix is in
    // compare.html; quoting a cross-dpr total beside a 1x raster would be a
    // number the picture beside it does not show.
    const cov = e
      ? INDICATOR_SIZES.map((s) => strokeCoverage(e[0], s).softness.toFixed(2)).join(" / ")
      : "not on the 24 grid";
    return (
      `<text x="${PAD}" y="${y + 16}" font-family="monospace" font-size="12" fill="${g.fg}">${r.id}</text>` +
      `<text x="${PAD}" y="${y + 32}" font-family="monospace" font-size="9" fill="${g.soft}">${r.box.w} x ${r.box.h}, a${r.box.aspect}</text>` +
      `<text x="${PAD}" y="${y + 45}" font-family="monospace" font-size="9" fill="${g.soft}">flap ${r.flap.angle.toFixed(1)} deg</text>` +
      (e ? `<text x="${PAD}" y="${y + 61}" font-family="monospace" font-size="9" fill="${g.soft}">y ${e[0]} / ${e[1]}</text>` : "") +
      `<text x="${PAD}" y="${y + 74}" font-family="monospace" font-size="9" fill="${g.soft}">soft@1x ${cov}</text>`
    );
  }).join("");

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${g.bg}"/>${head}${labels}</svg>`;

  const composites = [];
  for (const [i, r] of ISO_ROWS.entries()) {
    for (const [j, s] of INDICATOR_SIZES.entries()) {
      const one = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${VIEW} ${VIEW}"><rect width="${VIEW}" height="${VIEW}" fill="${cardSkin(g).bg}"/><g fill="none" stroke="${g.attention}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${stripInner(
        markSvg(r.mark, { size: s, resting: true }),
      )}</g></svg>`;
      const tile = await sharp(Buffer.from(one)).png().resize(s * ZOOM, s * ZOOM, { kernel: "nearest" }).toBuffer();
      composites.push({
        input: tile,
        left: colX(j) + Math.round((CELL - s * ZOOM) / 2),
        top: TOP + i * ROW + Math.round((CELL - s * ZOOM) / 2),
      });
    }
  }

  await sharp(Buffer.from(base)).composite(composites).png().toFile(join(OUT, `_isolation-zoom-${g.id}.png`));
};

for (const g of GROUNDS) await zoomSheet(g);
console.log(`Wrote ${GROUNDS.length} pixel-truth zooms (${INDICATOR_SIZES.join("/")}px) -> exploration/activity/_isolation-zoom-*.png`);
