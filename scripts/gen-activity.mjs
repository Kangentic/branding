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
  SPIN_MS,
  STROKE,
  VIEW,
  dashInUserUnits,
  markSvg,
  motionCss,
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

const LADDER = [12, 14, 16, 18, 20, 24];
const ROW_SIZE = 14; // the real project-sidebar row size
const ADJACENCY_SIZES = [12, 14, 16];

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

// The set's five marks and where each one lives, so the section reads as a set
// rather than as three indicators with two buttons bolted on.
const MARK_ROLES = {
  "agent-idle": "project sidebar, task card, tooltip",
  "agent-working": "project sidebar, task card, tooltip",
  "terminal-idle": "project sidebar, title bar",
  "terminal-working": "project sidebar, title bar",
  "control-pause-idle": "task detail header",
  "control-pause-working": "task detail header",
  "control-stop-idle": "Command Terminal header",
  "control-stop-working": "Command Terminal header",
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
    <p class="note">Bounding boxes match and areas are within 1 percent. The aspect ratios do not, so scaling cannot reconcile them. Every candidate below is redrawn on one ${INK_BOX} x ${INK_BOX} ink box inside a ${VIEW} viewBox, stroke ${STROKE}, currentColor only.</p>
    <div class="bar">
      <button id="freeze" aria-pressed="false">Freeze motion</button>
      <button id="rest" aria-pressed="false">Preview reduced motion</button>
      <span class="note">Theme follows your system; the host toggle overrides it.</span>
    </div>
  </header>

  <section>
    <div class="sec-hd">
      <h2>Every direction as the project panel would render it</h2>
      <p>Two project rows per direction, at ${ROW_SIZE}px, with the counts that are always beside these marks in the real sidebar. Two rows because the Command Terminal aggregates to <b>one tone per project</b>: the first project's terminal is amber and still, the second's is green and marching, so both terminal states are on screen at once the way the real sidebar shows them. The top pair is what ships today. Each counter sits in a fixed cell with a hairline datum, so a glyph that is wider or shorter than its neighbours has nowhere to hide.</p>
    </div>
    ${alignmentBand()}
    <p class="note">Read this one first and the rest of the page as evidence for it. A redrawn envelope looks almost identical to the stock one on its own, because what changed is the <b>ink box</b>, and an ink box is only visible next to another one.</p>
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
    <p class="note">Envelope flap: <b>${FLAP_DEFAULT}</b>, depth ${flapVariant(FLAP_DEFAULT).depth}, vertex ${flapVariant(FLAP_DEFAULT).angle} degrees, settled 2026-07-28 from a six-variant study. It takes lucide Mail's flap ratios and puts them on this set's ${INK_BOX} x ${INK_BOX} box, so the angle is lucide's and the ink box is ours. The rejected variants stay declared in <span class="mono">lib/activity.mjs</span>; the first draft at depth ${flapVariant("deep").depth} read as a downward arrow rather than a flap.</p>
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
// Size strips for /brand-review. Review artifacts, so exploration/, and they
// resolve each dash into user units first because librsvg ignores pathLength.
// ---------------------------------------------------------------------------

const STRIP_SIZES = [12, 14, 16, 20, 24];
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
