// gen-priority.mjs - the priority meter: equal bars, drawn by the desktop app,
// its web demo and kangentic-mobile.
//
// Writes:
//   assets/priority/meter-{0..4}.svg   the default scale's reference meters, currentColor
//   assets/priority/meter.json         the contract: numbers, rules, pixelSnap,
//                                      maxLevels, worked examples
//   exploration/priority/meter.html    the review page (NOT shipped)
//
// All geometry and rules come from lib/priority.mjs. This file declares none.
//
// Usage: npm run gen:priority   (or node scripts/gen-priority.mjs)
//        node scripts/gen-priority.mjs --review
//          The review page only, assets/ untouched. A card in the Design column
//          may edit scripts/ and exploration/ but never assets/, so a Design
//          round renders its candidates this way; the build drops the flag.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  BAR_GAP,
  BAR_H,
  BAR_R,
  BAR_W,
  DECISIONS,
  DEFAULT_LEVEL_COUNT,
  DPR_CANDIDATES,
  MANIFEST_FILE,
  MAX_LEVELS,
  NONE_OPACITY,
  RISING,
  SHIPPED_FILES,
  UNLIT_OPACITY,
  manifest,
  pixelSnap,
  meterBars,
  meterFile,
  meterRasterSvg,
  meterSvg,
  meterWidth,
  risingBars,
  snappedBarWidths,
} from "./lib/priority.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIP = join(ROOT, "assets", "priority");
const OUT = join(ROOT, "exploration", "priority");

// ---------------------------------------------------------------------------
// The shipped files.
// ---------------------------------------------------------------------------

const REVIEW_ONLY = process.argv.includes("--review");
if (REVIEW_ONLY) {
  console.log("--review: assets/priority/ left untouched");
} else {
  await mkdir(SHIP, { recursive: true });
  for (let level = 0; level < DEFAULT_LEVEL_COUNT; level++) {
    await writeFile(join(SHIP, meterFile(level)), meterSvg(level) + "\n");
  }
  await writeFile(join(SHIP, MANIFEST_FILE), JSON.stringify(manifest(), null, 2) + "\n");
  console.log(`Wrote ${DEFAULT_LEVEL_COUNT} reference meters + ${MANIFEST_FILE} -> assets/priority/`);
}

// ---------------------------------------------------------------------------
// Review data. Artifacts under exploration/, so NOT held to byte determinism.
//
// The scale is the desktop's default (DEFAULT_PRIORITY_CONFIG in kangentic's
// src/shared/types.ts), restated here as review data: a scale is the project's
// data, never the brand's, so it does not ship. The grounds are read off the
// consumers: kangentic src/renderer/index.css (:root, .theme-light, .theme-clay)
// and kangentic-mobile src/components/theme/tokens.ts (darkTerminalTheme).
// ---------------------------------------------------------------------------

const SCALE = [
  { label: "None", color: "#6b7280" },
  { label: "Low", color: "#3b82f6" },
  { label: "Medium", color: "#eab308" },
  { label: "High", color: "#f97316" },
  { label: "Urgent", color: "#ef4444" },
];
const FALLBACK = "#6b7280";
const colorOf = (level) => (SCALE[level] ?? { color: FALLBACK }).color;
const labelOf = (level) => (SCALE[level] ?? { label: `P${level}` }).label;

const GROUNDS = {
  dark: { label: "Desktop, dark", note: "default theme, the card's raised surface", bg: "#18181b", panel: "#27272a", fg: "#f4f4f5", soft: "#a1a1aa", faint: "#71717a", edge: "#3f3f46", globe: "#34d399" },
  light: { label: "Desktop, light", note: "light theme", bg: "#f5f5f4", panel: "#fafaf9", fg: "#1c1917", soft: "#57534e", faint: "#78716c", edge: "#d6d3d1", globe: "#34d399" },
  clay: { label: "Desktop, clay", note: "the cream theme", bg: "#f6f1e8", panel: "#faf6ee", fg: "#24201b", soft: "#675f52", faint: "#8a8173", edge: "#d4d0c7", globe: "#34d399" },
  phone: { label: "Phone", note: "dark only", bg: "#0f0d0a", panel: "#16120d", fg: "#f0e9dd", soft: "#b5a892", faint: "#7b7263", edge: "#332b21", globe: "#3ddc84" },
};

// ---- contrast ----------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const over = (fg, bg, a) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const lum = (h) =>
  rgb(h)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const r2 = (v) => v.toFixed(2);

const CONTRAST = Object.entries(GROUNDS).map(([id, g]) => ({
  id,
  g,
  rows: SCALE.slice(1).map((s) => {
    const unlit = over(s.color, g.panel, UNLIT_OPACITY);
    return { ...s, litOnGround: ratio(s.color, g.panel), unlitOnGround: ratio(unlit, g.panel), litVsUnlit: ratio(s.color, unlit) };
  }),
}));
for (const c of CONTRAST) {
  console.log(`  ${c.id}: lit vs unlit ${c.rows.map((r) => `${r.label} ${r2(r.litVsUnlit)}`).join(", ")}`);
}

// ---------------------------------------------------------------------------
// Pixel truth. Rasterize FIRST at the device size, then nearest-upscale in a
// second sharp pipeline (a one-step resize re-renders the vector and shows no
// pixels; activity-icon-geometry.md). The ground goes INTO the raster so the
// antialiased corners blend onto it.
// ---------------------------------------------------------------------------

const ZOOM = 6;
const DPRS = [1, 1.25, 1.5, 1.75, 2];
const PIX_LEVEL = 3;

async function pixelTile(svg, ground) {
  const w = +/width="([\d.]+)"/.exec(svg)[1];
  const h = +/height="([\d.]+)"/.exec(svg)[1];
  const withGround = svg.replace(/(<svg[^>]*>)/, `$1<rect width="${w}" height="${h}" fill="${ground}"/>`);
  const png = await sharp(Buffer.from(withGround)).png().toBuffer();
  const big = await sharp(png).resize(w * ZOOM, h * ZOOM, { kernel: "nearest" }).png().toBuffer();
  return { src: `data:image/png;base64,${big.toString("base64")}`, w: w * ZOOM, h: h * ZOOM };
}

// Painted bar widths read back from Chromium on 2026-11-22: scratch page with a
// real title row, CSS zoom per scale, the capture's pixel runs counted. Recorded
// as data because the review states it; the model rows above are the generator's.
const MEASURED = [
  { pct: "125%", a: "4 4 4 3", b: "4 4 4 4" },
  { pct: "150%", a: "4 5 4 5", b: "5 5 5 5" },
  { pct: "175%", a: "6 5 5 5", b: "5 5 5 5" },
];

// The colors a user can give a level: the label palette's swatches
// (kangentic src/shared/label-palette.ts), plus the custom picker, which takes
// any hex. Two custom picks show its edges: a dark slate and a pale yellow.
const SWATCHES = [
  ["gray", "#6b7280"], ["red", "#ef4444"], ["rose", "#f43f5e"], ["orange", "#f97316"],
  ["amber", "#f59e0b"], ["green", "#10b981"], ["cyan", "#06b6d4"], ["blue", "#3b82f6"],
  ["violet", "#8b5cf6"], ["pink", "#ec4899"], ["stone", "#78716c"],
];
const CUSTOM = [["custom slate", "#1f2937"], ["custom pale", "#fde68a"]];

const PIX_ROWS = [
  { id: "rising", label: "Before: the rising meter", sub: `${RISING.shortest} to ${RISING.tallest}px, layout px`, opts: { snap: "layout", rising: true } },
  { id: "layout", label: "A. Layout pixels (rejected)", sub: "how a span or a View draws plain 3px bars", opts: { snap: "layout" } },
  { id: "device", label: "B. Whole device pixels (shipped)", sub: "pixelSnap(): bar, gap, height rounded once, half up", opts: { snap: "device" } },
  { id: "svg", label: "The reference SVG", sub: "as an <img>, no snapping", opts: { snap: "none" } },
];
const pix = [];
for (const row of PIX_ROWS) {
  const cells = [];
  for (const dpr of DPRS) {
    const svg = meterRasterSvg({ level: PIX_LEVEL, color: colorOf(PIX_LEVEL), dpr, ...row.opts });
    const tile = await pixelTile(svg, GROUNDS.dark.panel);
    let widths = "";
    if (row.id === "layout") widths = snappedBarWidths(DEFAULT_LEVEL_COUNT, dpr).join(" ");
    else if (row.id === "device") widths = Array(DEFAULT_LEVEL_COUNT - 1).fill(pixelSnap(dpr).device.width).join(" ");
    else if (row.id === "svg") widths = `${+(BAR_W * dpr).toFixed(2)} each, soft`;
    else widths = snappedBarWidths(DEFAULT_LEVEL_COUNT, dpr).join(" ");
    cells.push({ dpr, tile, widths });
  }
  pix.push({ ...row, cells });
}

// ---------------------------------------------------------------------------
// The page. Self-contained, published as written (the stopped.html precedent).
// Every true-size meter is drawn LIVE in the viewer's browser: the reference
// SVGs inline exactly as meterSvg() ships them, and the in-place cards as spans
// sized from the lib's numbers, which is how the desktop draws it. So the page
// shows what the viewer's own display does to the bars.
// ---------------------------------------------------------------------------

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A span meter, the desktop's construction. `mode` picks the candidate's sizing. */
const spanMeter = (level, { levelCount = DEFAULT_LEVEL_COUNT, mode = "layout", rising = false, color = null } = {}) => {
  const bars = rising ? risingBars(level, levelCount) : meterBars(level, levelCount);
  const inner = bars
    .map((b) => `<i style="opacity:${b.opacity}${rising ? `;height:${b.h}px` : ""}"></i>`)
    .join("");
  return `<span class="pm${rising ? " pm--rising" : ""}" data-mode="${mode}" style="color:${color ?? colorOf(level)}" aria-hidden="true">${inner}</span>`;
};
/** The shipped reference SVG, inline, tinted by `color`. */
const refSvg = (level, levelCount = DEFAULT_LEVEL_COUNT) =>
  `<span class="ref" style="color:${colorOf(level)}">${meterSvg(level, levelCount)}</span>`;

const tok = (g) =>
  `--t-bg:${g.bg};--t-panel:${g.panel};--t-fg:${g.fg};--t-soft:${g.soft};--t-faint:${g.faint};--t-edge:${g.edge};--t-globe:${g.globe}`;

// A plain globe for the title row's right corner. Drawn here, not copied: a
// circle, a meridian ellipse and an equator.
const globe = `<svg class="globe" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="6" cy="6" r="5"/><ellipse cx="6" cy="6" rx="2.2" ry="5"/><path d="M1 6h10"/></svg>`;
const flag = (c) =>
  `<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 11V1.5M2.5 2h6.5l-1.5 2.5L9 7H2.5"/></svg>`;
const prGlyph = `<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="3.5" cy="3" r="1.6"/><circle cx="3.5" cy="11" r="1.6"/><circle cx="10.5" cy="11" r="1.6"/><path d="M3.5 4.6v4.8M10.5 9.4V6a2 2 0 0 0-2-2H6.5"/></svg>`;

// ---- desktop cards ----------------------------------------------------------

const deskCard = (g, { level, order, mode = "layout", rising = false, title, id, browser = true, labels = [], fixed = false }) => {
  const meter = spanMeter(level, { mode, rising, color: fixed ? g.soft : null });
  const idEl = `<span class="c-id">#${id}</span>`;
  const right = order === "before" ? `${meter}${idEl}` : `${idEl}${meter}`;
  return `<div class="c" style="${tok(g)}">
  <div class="c-hd"><span class="c-title">${esc(title)}</span>${right}${browser ? `<span class="c-globe">${globe}</span>` : ""}</div>
  <p class="c-desc">Move the export button into the share sheet and drop the old menu entry.</p>
  ${labels.length ? `<div class="c-pills">${labels.map((l) => `<span class="pill">${l}</span>`).join("")}</div>` : ""}
</div>`;
};

const DESK_CARDS = [
  { level: 4, title: "Fix the crash on resume", id: 1162, browser: true },
  { level: 3, title: "Share sheet export", id: 1158, browser: false, labels: ["ui"] },
  { level: 2, title: "Tidy the backlog filters", id: 1149, browser: false },
  { level: 1, title: "Docs: priority scale", id: 1131, browser: false },
];

const deskColumn = (g, variant) =>
  DESK_CARDS.map((c) =>
    variant === "before"
      ? deskCard(g, { ...c, order: "before", rising: true })
      : variant === "fixed"
        ? deskCard(g, { ...c, order: "after", fixed: true })
        : deskCard(g, { ...c, order: "after", mode: variant }),
  ).join("");

// ---- how long a scale can get --------------------------------------------------
// Kangentic's Priorities popover adds a level with no limit, and the rule adds
// BAR_W + BAR_GAP per level, so the title row is where a long scale shows up.

const LONG_SCALES = [5, 7, 10, 15];
const longCard = (g, lc) => {
  const level = lc - 1;
  const meter = `<span class="pm" style="color:${colorOf(4)}" aria-hidden="true">${meterBars(level, lc)
    .map((b) => `<i style="opacity:${b.opacity}"></i>`)
    .join("")}</span>`;
  return `<div class="cardcol"><h3>${lc} levels</h3><p>${meterWidth(lc)}px of a 224px card</p><div class="stack" style="${tok(g)};width:244px;max-width:100%;box-sizing:border-box"><div class="c" style="${tok(g)}">
  <div class="c-hd"><span class="c-title">Fix the crash on resume</span><span class="c-id">#1162</span>${meter}<span class="c-globe">${globe}</span></div>
  <p class="c-desc">Move the export button into the share sheet and drop the old menu entry.</p></div></div></div>`;
};

// ---- who picks the color ------------------------------------------------------

const swatchTile = (g) => {
  const cell = ([name, c]) => {
    const lv = ratio(c, over(c, g.panel, UNLIT_OPACITY));
    return `<figure class="sw"><span class="ref" style="color:${c}">${meterSvg(2)}</span><figcaption>${name}<span class="${lv < 1.5 ? "low" : ""}">${r2(lv)}:1</span></figcaption></figure>`;
  };
  return `<div class="tile" style="${tok(g)}"><div class="tile-hd"><b>${g.label}</b><span>Medium (2 of 4) in each color; lit against unlit</span></div>
  <div class="sws">${SWATCHES.map(cell).join("")}${CUSTOM.map(cell).join("")}</div></div>`;
};

// ---- phone cards --------------------------------------------------------------

const phoneCard = (variant, c) => {
  const g = GROUNDS.phone;
  const col = colorOf(c.level);
  const idEl = `<span class="c-id">#${c.id}</span>`;
  const pr = c.pr ? `<span class="c-pr">${prGlyph}</span>` : "";
  const labels = (c.labels ?? []).map((l) => `<span class="pill pill--sq">${l}</span>`).join("");
  let titleRight = `${idEl}${pr}`;
  let row = labels;
  if (variant === "before") {
    const pill = `<span class="flagpill" style="color:${col};background:${over(col, g.panel, 0.14)};border-color:${over(col, g.panel, 0.4)}">${flag(col)}${labelOf(c.level)}</span>`;
    row = pill + labels;
  } else if (variant === "title") {
    titleRight = `${idEl}${spanMeter(c.level)}${pr}`;
  } else if (variant === "labels") {
    row = `<span class="pm-bare">${spanMeter(c.level)}</span>${labels}`;
  }
  return `<div class="c c--phone" style="${tok(g)}">
  <div class="c-hd"><span class="c-title">${esc(c.title)}</span>${titleRight}</div>
  <p class="c-desc">Move the export button into the share sheet and drop the old menu entry.</p>
  ${row ? `<div class="c-pills">${row}</div>` : ""}
</div>`;
};
const PHONE_CARDS = [
  { level: 4, title: "Fix the crash on resume", id: 1162, pr: true, labels: ["bug"] },
  { level: 3, title: "Share sheet export", id: 1158, pr: false, labels: ["ui", "ios"] },
  { level: 2, title: "Tidy the backlog filters", id: 1149, pr: true, labels: [] },
];
const phoneColumn = (variant) => PHONE_CARDS.map((c) => phoneCard(variant, c)).join("");

// ---- sections -----------------------------------------------------------------

const LEVELS = [0, 1, 2, 3, 4, 6];
const specimenTile = (g) => `<div class="tile" style="${tok(g)}">
  <div class="tile-hd"><b>${g.label}</b><span>${g.note}</span></div>
  <table class="spec"><thead><tr><th></th>${LEVELS.map((l) => `<th>${l === 6 ? "past the end" : labelOf(l)}<span>${l}</span></th>`).join("")}</tr></thead>
  <tbody>
    <tr><th>before</th>${LEVELS.map((l) => `<td>${spanMeter(l, { rising: true })}</td>`).join("")}</tr>
    <tr class="spec-after"><th>after</th>${LEVELS.map((l) => `<td>${refSvg(l)}</td>`).join("")}</tr>
  </tbody></table>
</div>`;

const SCALES = [2, 3, 5, 7];
const scaleTile = (g) => `<div class="tile" style="${tok(g)}">
  <div class="tile-hd"><b>Any scale length</b><span>${g.label}, every level of each scale</span></div>
  <table class="spec"><tbody>
  ${SCALES.map(
    (lc) =>
      `<tr><th>${lc} levels<span>${meterWidth(lc)} x ${BAR_H}</span></th><td class="spec-run">${Array.from({ length: lc }, (_, l) => `<span class="ref" style="color:${SCALE[Math.min(l, 4)].color}">${meterSvg(l, lc)}</span>`).join("")}</td></tr>`,
  ).join("")}
  </tbody></table>
</div>`;

const contrastTable = CONTRAST.map(
  (c) => `<tr><th>${c.g.label}</th>${c.rows.map((r) => `<td class="${r.litVsUnlit < 2 ? "low" : ""}">${r2(r.litVsUnlit)}<span>${r2(r.litOnGround)} on ground</span></td>`).join("")}</tr>`,
).join("");

const pixTable = `<table class="pix"><thead><tr><th></th>${DPRS.map((d) => `<th>${d}x<span>${Math.round(d * 100)}%</span></th>`).join("")}</tr></thead><tbody>
${pix
  .map(
    (row) =>
      `<tr class="pix-${row.id}"><th>${esc(row.label)}<span>${esc(row.sub)}</span></th>${row.cells
        .map((c) => `<td><img src="${c.tile.src}" width="${c.tile.w}" height="${c.tile.h}" alt="${esc(row.label)} at ${c.dpr}x, nearest x${ZOOM}"><span>${c.widths}</span></td>`)
        .join("")}</tr>`,
  )
  .join("\n")}
</tbody></table>`;

const manifestText = JSON.stringify(manifest(), null, 2);
const manifestHead = manifestText.split("\n").slice(0, 40).join("\n") + "\n  ...";

const page = `<title>Priority meter contract</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Layout: one reading column of sections; every specimen is a tile painted in a
   consumer surface's real tokens, so it keeps its ground in either page theme.
   Card mocks use the system face, as the consumers do. */
:root {
  --bg: #fdfbf7;
  --surface: #f6f1e8;
  --fg: #24201b;
  --soft: #6e6659;
  --rule: rgba(36, 32, 27, 0.16);
  --accent: #c0562f;
  --display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --body: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  --sys: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --pm-w: ${BAR_W}px; --pm-gap: ${BAR_GAP}px; --pm-h: ${BAR_H}px; --pm-r: ${BAR_R}px;
  --dev-w: ${BAR_W}px; --dev-gap: ${BAR_GAP}px; --dev-h: ${BAR_H}px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #1d1915; --surface: #262019; --fg: #f3ede3; --soft: #b5a892; --rule: rgba(243, 237, 227, 0.14); --accent: #e07a52; color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #1d1915; --surface: #262019; --fg: #f3ede3; --soft: #b5a892; --rule: rgba(243, 237, 227, 0.14); --accent: #e07a52; color-scheme: dark; }
body { background: var(--bg); color: var(--fg); font-family: var(--body); font-size: 15px; line-height: 1.55; }
.wrap { max-width: 1120px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 48px; }
.wrap > * { min-width: 0; }
header { display: grid; gap: 12px; max-width: 72ch; }
.eyebrow { font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); }
h1 { font-family: var(--display); font-size: clamp(30px, 5vw, 44px); line-height: 1.05; margin: 0; text-wrap: balance; }
h2 { font-family: var(--display); font-size: 24px; margin: 0; text-wrap: balance; }
h3 { font-family: var(--mono); font-size: 14px; font-weight: 500; margin: 0; }
p { margin: 0; }
.lede { color: var(--soft); }
.lede b, section > p b { color: var(--fg); }
section { display: grid; gap: 16px; min-width: 0; }
section > p { max-width: 72ch; color: var(--soft); }
.scroll { overflow-x: auto; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr)); gap: 16px; }
.tile { background: var(--t-bg); color: var(--t-fg); border-radius: 8px; padding: 16px; display: grid; gap: 14px; min-width: 0; overflow-x: auto; }
.tile-hd { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--t-soft); }
.tile-hd b { color: var(--t-fg); font-weight: 500; }

/* the meter, drawn as the desktop draws it */
.pm { display: inline-flex; align-items: center; gap: var(--pm-gap); height: var(--pm-h); flex: none; }
.pm i { display: block; width: var(--pm-w); height: var(--pm-h); border-radius: var(--pm-r); background: currentColor; }
.pm[data-mode="device"] { gap: var(--dev-gap); height: var(--dev-h); }
.pm[data-mode="device"] i { width: var(--dev-w); height: var(--dev-h); }
.pm--rising { align-items: flex-end; height: ${RISING.tallest}px; }
.ref { display: inline-flex; flex: none; }
.ref svg { display: block; }

/* specimen tables */
.spec { border-collapse: collapse; font-family: var(--mono); font-size: 11px; color: var(--t-soft); }
.spec th, .spec td { padding: 8px 12px; text-align: center; vertical-align: middle; font-weight: 400; }
.spec thead th { vertical-align: bottom; line-height: 1.25; }
.spec thead th span, .spec tbody th span { display: block; font-size: 10px; opacity: 0.75; }
.spec tbody th { text-align: left; color: var(--t-fg); white-space: nowrap; padding-left: 0; }
.spec-after td { background: color-mix(in srgb, var(--t-soft) 12%, transparent); }
.spec-run { text-align: left !important; }
.spec-run .ref { margin-right: 14px; vertical-align: middle; }

/* cards */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 244px), 1fr)); gap: 16px; }
.cardcol { display: grid; gap: 8px; align-content: start; min-width: 0; }
.cardcol > h3 { font-size: 13px; }
.cardcol > p { font-size: 13px; color: var(--soft); }
.stack { background: var(--t-bg); border-radius: 8px; padding: 10px; display: grid; gap: 8px; }
.c { background: var(--t-panel); color: var(--t-fg); border: 1px solid var(--t-edge); border-radius: 6px; padding: 10px; min-width: 0; font-family: var(--sys); }
.c--phone { border-radius: 10px; padding: 12px; }
.c-hd { display: flex; align-items: center; gap: 6px; min-width: 0; height: 20px; }
.c--phone .c-hd { gap: 8px; }
.c-title { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c--phone .c-title { font-weight: 600; }
.c-id { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: var(--t-faint); flex: none; }
.c-globe { color: var(--t-globe); display: inline-flex; flex: none; }
.c-pr { color: var(--t-soft); display: inline-flex; flex: none; }
.c-desc { font-size: 12px; color: var(--t-faint); margin-top: 4px; line-height: 1.35; }
.c-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; align-items: center; min-height: 22px; }
.pill { font-size: 11px; line-height: 16px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--t-edge); color: var(--t-soft); }
.pill--sq { border-radius: 4px; }
.flagpill { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; line-height: 16px; padding: 1px 8px; border: 1px solid; border-radius: 4px; }
.pm-bare { display: inline-flex; align-items: center; min-height: 20px; padding-right: 2px; }

/* candidates */
.dirs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px; }
.dir { display: grid; gap: 8px; align-content: start; min-width: 0; }
.dir-idea { font-family: var(--display); font-size: 18px; }
.dir p { font-size: 14px; color: var(--soft); }
.dir p b { color: var(--fg); font-weight: 600; }
.sws { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 12px 8px; }
.sw { margin: 0; display: grid; justify-items: center; gap: 6px; }
.sw figcaption { font-family: var(--mono); font-size: 10px; color: var(--t-soft); text-align: center; line-height: 1.3; }
.sw figcaption span { display: block; color: var(--t-fg); }
.sw figcaption span.low { color: #e05d5d; }
.rej { font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft); }
.rej-line { display: block; color: var(--soft); font-size: 14px; margin-top: 4px; }
.rec { font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); }

/* pixel truth */
.pix { border-collapse: collapse; font-family: var(--mono); font-size: 11px; color: var(--soft); }
.pix th, .pix td { padding: 10px 14px 10px 0; text-align: left; vertical-align: top; font-weight: 400; }
.pix thead th span, .pix tbody th span, .pix td span { display: block; font-size: 10px; }
.pix tbody th { color: var(--fg); min-width: 170px; max-width: 220px; white-space: normal; }
.pix img { display: block; image-rendering: pixelated; border-radius: 4px; max-width: none; }
.pix td span { margin-top: 4px; }
.pix-layout td span, .pix-device td span { color: var(--fg); }
.livebox { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; font-family: var(--mono); font-size: 12px; color: var(--soft); }
.livebox .tile { display: flex; gap: 20px; align-items: center; }

/* contrast */
.ct { border-collapse: collapse; font-family: var(--mono); font-size: 12px; font-variant-numeric: tabular-nums; }
.ct th, .ct td { padding: 6px 14px; text-align: right; font-weight: 400; border-top: 1px solid var(--rule); color: var(--soft); }
.ct thead th { border-top: 0; }
.ct tbody th { text-align: left; color: var(--fg); padding-left: 0; white-space: nowrap; }
.ct td { color: var(--fg); }
.ct td span { display: block; font-size: 10px; color: var(--soft); }
.ct .low { color: var(--accent); font-weight: 500; }

/* the contract */
pre { margin: 0; padding: 16px; background: var(--surface); border-radius: 8px; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.5; }
.files { display: grid; gap: 6px; font-family: var(--mono); font-size: 13px; }
.files li { color: var(--soft); }
.files li b { color: var(--fg); font-weight: 500; }
.open { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; counter-reset: q; }
.open li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; }
.open li::before { counter-increment: q; content: counter(q); font-family: var(--mono); font-size: 13px; color: var(--accent); padding-top: 2px; }
footer { font-family: var(--mono); font-size: 12px; color: var(--soft); }
</style>
<div class="wrap">
  <header>
    <span class="eyebrow">priority meter / kangentic #1160 / branding #24</span>
    <h1>Priority meter contract</h1>
    <p class="lede">kangentic #1160 signed off the look on 2026-11-22: <b>equal bars, one per level above None, lit up to the task's level</b>, 3px bars with 2px gaps, 10px tall, the level's color, unlit at 30% and None at 45%. This card makes the package own those numbers, so the desktop, the web demo and the phone draw one meter.</p>
    <p class="lede">The look is settled and is not reopened here. Rendering it on every ground the canvas did not show turned up <b>one new finding</b>: at 125%, 150% and 175% display scaling the four bars are not equal (section 3). The rest of this page is the contract and where the meter sits on each surface.</p>
    <p class="lede"><b>Shipped.</b> ${SHIPPED_FILES.map((f) => `<code>assets/priority/${f}</code>`).join(", ")}, gated by the <code>PRIORITY</code> invariant check and recorded in <code>.claude/rules/priority-meter-geometry.md</code>.</p>
  </header>

  <section>
    <h2>Signed off 2026-11-22: ${DECISIONS.map((d) => (d.picked === "as drawn" ? `${d.id} as drawn` : `${d.id}${d.picked}`)).join(", ")}</h2>
    <p>The record, from <code>DECISIONS</code> in <code>scripts/lib/priority.mjs</code>: each question, the pick, and every rejected direction with its reason.</p>
    <ol class="open">
      ${DECISIONS.map(
        (d) =>
          `<li><span><b>${esc(d.question)}.</b> Picked ${esc(d.picked)}: ${esc(d.pick)}.${d.rejected
            .map((r) => ` <span class="rej-line">Rejected ${esc(r.id)}, ${esc(r.idea)}: ${esc(r.reason)}</span>`)
            .join("")}</span></li>`,
      ).join("\n      ")}
    </ol>
  </section>

  <section>
    <h2>1. Every level, before and after</h2>
    <p>True size, drawn live in your browser. <b>Before</b> is the rising meter main ships today (${RISING.shortest} to ${RISING.tallest}px, retired by #1160). <b>After</b> is the reference SVG exactly as <code>meterSvg()</code> ships it, tinted by <code>color</code>. Level 6 is past the end of a five-level scale: every bar lit, in the fallback gray.</p>
    <div class="grid2">${Object.values(GROUNDS).map(specimenTile).join("")}</div>
    <div class="grid2">${scaleTile(GROUNDS.dark)}${scaleTile(GROUNDS.light)}</div>
  </section>

  <section>
    <h2>2. Lit against unlit, on each ground</h2>
    <p>The count of lit bars carries the rank, so what matters is how far a lit bar stands from an unlit one in the same color. Contrast ratio of a lit bar against an unlit one, with the lit bar against the card below it. <b>Light grounds are new information</b>; the canvas was dark only. Medium's yellow is the weakest pair on the light card, at ${r2(CONTRAST.find((c) => c.id === "light").rows[1].litVsUnlit)}:1. It still reads in section 1, and an opacity cannot lift it far, because the ceiling is the color itself, ${r2(CONTRAST.find((c) => c.id === "light").rows[1].litOnGround)}:1 on that card. The scale's colors are the project's data, not this package's, so this is <b>recorded, not offered</b>.</p>
    <div class="scroll"><table class="ct"><thead><tr><th></th>${SCALE.slice(1).map((s) => `<th>${s.label}</th>`).join("")}</tr></thead><tbody>${contrastTable}</tbody></table></div>
  </section>

  <section>
    <h2>3. Pixel truth, and the one new finding</h2>
    <p>High (3 of 4 lit) on the dark card, rasterized at each display scale and enlarged ${ZOOM}x with no smoothing. Each cell lists the four bars' widths in device pixels. A span's background and a View's frame have every edge rounded to a device pixel, so <b>row A is what plain 3px bars draw</b>: equal at 1x and 2x, unequal at 125%, 150% and 175%, the usual Windows laptop settings, with the meter starting on a whole pixel as this sheet places it. Android's 2.75 and 3.5 do the same. <b>Row B is what ships</b>: <code>pixelSnap()</code> sizes every bar in whole device pixels.</p>
    <div class="scroll">${pixTable}</div>
    <div class="livebox"><span>Live on your display (devicePixelRatio <b id="dpr">1</b>): A then B, High and Medium</span>
      <div class="tile" style="${tok(GROUNDS.dark)}">${spanMeter(3)}${spanMeter(3, { mode: "device" })}${spanMeter(2)}${spanMeter(2, { mode: "device" })}</div>
      <div class="tile" style="${tok(GROUNDS.light)}">${spanMeter(3)}${spanMeter(3, { mode: "device" })}${spanMeter(2)}${spanMeter(2, { mode: "device" })}</div>
    </div>
    <div class="dirs">
      ${DPR_CANDIDATES.map(
        (c, i) => `<div class="dir"><span class="dir-idea">${"AB"[i]}. ${esc(c.idea)}</span>${c.selected ? `<span class="rec">shipped</span>` : `<span class="rej">rejected</span>`}<p>${esc(c.note)}</p></div>`,
      ).join("")}
    </div>
    <p><b>Measured in Chromium, 2026-11-22</b>, not only modeled: a real title row (title, #N, then the span meter), with CSS zoom standing in for the display scale. Row A painted ${MEASURED.map((m) => `${m.a} at ${m.pct}`).join(", ")}. Row B painted ${MEASURED.map((m) => `${m.b} at ${m.pct}`).join(", ")}. Which bar comes out wide depends on where the meter starts on the row, so the sheet above shows one placement and a card shows another; under A some bar is always off. The phone's 2.75x and 3.5x are modeled from Yoga's edge rounding, not measured here.</p>
    <p><b>Why B.</b> It keeps the signed-off look exactly at 1x, 2x and 3x, and makes it true at every other scale. Each of bar, gap and height is rounded once, half up, because 1.5x bar width (4.5) and 1.25x gap (2.5) are exact ties. The phone gets it for one call (<code>PixelRatio.roundToNearestPixel(3)</code>). The desktop needs <code>devicePixelRatio</code> and a listener for a monitor change, a small addition to #1160's <code>PriorityMeter.tsx</code>. The reference SVG (last row) does not snap at all: it is soft at every fractional scale, which is why it is a reference and not what a card draws.</p>
  </section>

  <section>
    <h2>4. In place</h2>
    <p>Each surface as its consumer builds it: system face, 14px title on a 20px row, the meter centered on that row. Measured 2026-11-22 in Chromium on Windows: the 14px title's baseline sits at 15 and its capital height is 10, so the cap band is 5 to 15, exactly where the 10px meter sits. From their metrics, SF Pro's cap band centers 0.04px low and Roboto's 0.19px high.</p>
    <div class="cards">
      <div class="cardcol"><h3>Desktop dark, before</h3><p>Rising meter, before #N</p><div class="stack" style="${tok(GROUNDS.dark)}">${deskColumn(GROUNDS.dark, "before")}</div></div>
      <div class="cardcol"><h3>Desktop dark, shipped</h3><p>#N, meter, globe (1A), whole device pixels (1B)</p><div class="stack" style="${tok(GROUNDS.dark)}">${deskColumn(GROUNDS.dark, "device")}</div></div>
      <div class="cardcol"><h3>Desktop dark, A (rejected)</h3><p>The same in plain layout pixels</p><div class="stack" style="${tok(GROUNDS.dark)}">${deskColumn(GROUNDS.dark, "layout")}</div></div>
    </div>
    <div class="cards">
      <div class="cardcol"><h3>Desktop light, before</h3><p>Rising meter, before #N</p><div class="stack" style="${tok(GROUNDS.light)}">${deskColumn(GROUNDS.light, "before")}</div></div>
      <div class="cardcol"><h3>Desktop light, shipped</h3><p>#N, meter, globe</p><div class="stack" style="${tok(GROUNDS.light)}">${deskColumn(GROUNDS.light, "device")}</div></div>
      <div class="cardcol"><h3>Desktop clay, shipped</h3><p>The cream theme</p><div class="stack" style="${tok(GROUNDS.clay)}">${deskColumn(GROUNDS.clay, "device")}</div></div>
    </div>
    <h3>The phone (decision 2)</h3>
    <div class="cards">
      <div class="cardcol"><h3>Phone, before</h3><p>The flag pill leads the labels row</p><div class="stack" style="${tok(GROUNDS.phone)}">${phoneColumn("before")}</div></div>
      <div class="cardcol"><h3>A. Title row, after #N</h3><span class="rec">picked</span><p>The desktop's order (1A): title, #N, meter, then the PR glyph in the corner. The labels row is left for labels, and a card with no labels loses no row.</p><div class="stack" style="${tok(GROUNDS.phone)}">${phoneColumn("title")}</div></div>
      <div class="cardcol"><h3>B. Labels row, where the pill was</h3><span class="rej">rejected</span><p>The smallest change to the phone: the meter alone leads the labels row. A card with no labels still needs the row, which #1146 removed on the desktop.</p><div class="stack" style="${tok(GROUNDS.phone)}">${phoneColumn("labels")}</div></div>
    </div>
  </section>

  <section>
    <h2>5. Level 0, and what a consumer supplies</h2>
    <p><b>A card draws nothing at level 0</b> and keeps no slot (2B); the phone's <code>priorityLevelFor</code> already returns null there. A list or picker that names every level, such as the Backlog pill, the Priorities popover and an automation's Priority condition, draws level 0 as every bar at ${NONE_OPACITY}. The meter is decorative everywhere: the element around it carries the name ("Priority: High"), as the desktop's badge and the phone's pill already do. Past the end of the scale, the consumer supplies its fallback gray, as both already do for <code>P&lt;n&gt;</code>.</p>
  </section>

  <section>
    <h2>5b. How long a scale can get (decision 5)</h2>
    <p><b>Nothing in kangentic caps it yet.</b> The reference SVGs are drawn for the default five levels (18 x 10), but the rule itself has no maximum: the meter grows ${BAR_W + BAR_GAP}px per level, and kangentic's Add Priority button has no limit as of 2026-11-22. Here is the top level of each scale in a narrow 224px card, the width #1160 was reviewed at. The title gives up its width first.</p>
    <div class="cards">${LONG_SCALES.map((lc) => longCard(GROUNDS.dark, lc)).join("")}</div>
    <div class="dirs">
      <div class="dir"><span class="dir-idea">A. No cap</span><span class="rej">rejected</span><p>The rule stays as signed off: one bar per level, however many. A project that wants fifteen levels gets a ${meterWidth(15)}px meter and short titles. Nothing changes in kangentic.</p></div>
      <div class="dir"><span class="dir-idea">B. Cap the scale at ${MAX_LEVELS} levels</span><span class="rec">shipped</span><p>${MAX_LEVELS} levels draw ${MAX_LEVELS - 1} bars, ${meterWidth(MAX_LEVELS)}px. <code>meter.json</code> states the cap as <code>maxLevels: ${MAX_LEVELS}</code>, for kangentic's Priorities popover to disable Add Priority there. That is a kangentic change, a follow-up there, and a project that already has more keeps them: the meter still draws by the rule, it just cannot grow further. One bar per level stays true.</p></div>
    </div>
  </section>

  <section>
    <h2>6. Who picks the color (decision 4)</h2>
    <p><b>The meter has no color of its own.</b> Every reference SVG is <code>currentColor</code> and <code>meter.json</code> carries no hex, so a level draws in whatever color it holds: a swatch from the Priorities popover, or any hex from its custom picker. It is extensible the same way. The bar count comes from the rule, not a fixed glyph, so a sixth level gives five bars (section 1, any scale length).</p>
    <div class="dirs">
      <div class="dir"><span class="dir-idea">A. The level's color, as the user picks it</span><span class="rec">shipped</span><p>Today's model, and what #1160 signed off. <b>No kangentic change</b> beyond #1160 importing the numbers: <code>PriorityMeter</code> already takes <code>color={entry.color}</code>, and the phone already receives each level's color over the protocol. Urgent reads red from across the board. The cost of a free choice: a color close to the ground thins the gap between lit and unlit bars, as the custom slate shows on dark and the pale yellow on light. Labels carry the same risk today.</p></div>
      <div class="dir"><span class="dir-idea">B. One fixed tone for every level</span><span class="rej">rejected</span><p>Every level draws in the row's muted text tone, and the lit count alone carries the rank. <b>A kangentic change:</b> the popover's color picker goes, <code>PriorityBadge</code> stops reading <code>entry.color</code>, and each level's stored color becomes dead data unless the protocol drops it, which is a phone change too. The meter is legible on every theme by construction, but an Urgent card no longer stands out from a Low one except by two bars.</p></div>
    </div>
    <div class="grid2">${swatchTile(GROUNDS.dark)}${swatchTile(GROUNDS.light)}</div>
    <div class="cards">
      <div class="cardcol"><h3>A, dark</h3><p>The default scale's colors</p><div class="stack" style="${tok(GROUNDS.dark)}">${deskColumn(GROUNDS.dark, "device")}</div></div>
      <div class="cardcol"><h3>B, dark</h3><p>One fixed tone, the row's muted text</p><div class="stack" style="${tok(GROUNDS.dark)}">${deskColumn(GROUNDS.dark, "fixed")}</div></div>
      <div class="cardcol"><h3>B, light</h3><p>The same on the light theme</p><div class="stack" style="${tok(GROUNDS.light)}">${deskColumn(GROUNDS.light, "fixed")}</div></div>
    </div>
    <p>Not drawn: a fixed per-level ramp owned by this package. It ships no color at all, only <code>currentColor</code> geometry, because the desktop, the phone and the website each tune color to their own grounds (design-language). A ramp would have to live in each consumer, which is where the level colors already live.</p>
  </section>

  <section>
    <h2>7. The contract (decision 3)</h2>
    <ul class="files">
      <li><b>assets/priority/meter.json</b>: the numbers, the rules as expressions, <code>pixelSnap</code> with a worked table of ${manifest().pixelSnap.examples.length} display scales, <code>maxLevels: ${MAX_LEVELS}</code>, placement, level 0 and accessibility, and a worked table of ${manifest().examples.length} cases across scales of 1, 2, 3, 5 and ${MAX_LEVELS} levels that a consumer's tests can assert against.</li>
      ${Array.from({ length: DEFAULT_LEVEL_COUNT }, (_, l) => `<li><b>assets/priority/${meterFile(l)}</b>: ${labelOf(l)}, ${meterBars(l, DEFAULT_LEVEL_COUNT).filter((b) => b.lit).length} of 4 lit</li>`).join("")}
    </ul>
    <p>Each SVG is <code>meter.json</code>'s bars drawn literally: one <code>&lt;rect&gt;</code> per bar at integer coordinates, <code>currentColor</code>, with <code>fill-opacity</code> on the unlit bars. They are a reference: the desktop draws spans and the phone draws Views from <code>meter.json</code>, because the phone's activity renderer would stroke these rects as outlines and drop their opacity. The <code>PRIORITY</code> invariant check holds the shipped files to the lib and recomputes both worked tables from the json's own numbers; <code>.claude/rules/priority-meter-geometry.md</code> is the binding record.</p>
    <pre>${esc(meterSvg(2))}</pre>
    <pre>${esc(manifestHead)}</pre>
  </section>

  <footer>Generated by scripts/gen-priority.mjs from scripts/lib/priority.mjs. The look is kangentic #1160's, signed off 2026-11-22 (1A, 2B, 3B, 4B); the contract is branding #24's, signed off the same day.</footer>
</div>
<script>
(function () {
  // pixelSnap() for the scales meter.json tabulates, emitted from the lib; any
  // other scale uses the same rule, round half up.
  var SNAP = ${JSON.stringify(Object.fromEntries(manifest().pixelSnap.examples.map((e) => [e.dpr, e.layout])))};
  var root = document.documentElement;
  function snap(v, d) { return Math.floor(v * d + 0.5) / d; }
  function apply() {
    var d = window.devicePixelRatio || 1;
    var s = SNAP[d] || { width: snap(${BAR_W}, d), gap: snap(${BAR_GAP}, d), height: snap(${BAR_H}, d) };
    root.style.setProperty("--dev-w", s.width + "px");
    root.style.setProperty("--dev-gap", s.gap + "px");
    root.style.setProperty("--dev-h", s.height + "px");
    var el = document.getElementById("dpr");
    if (el) el.textContent = String(Math.round(d * 1000) / 1000);
    try { matchMedia("(resolution: " + d + "dppx)").addEventListener("change", apply, { once: true }); } catch (e) {}
  }
  apply();
})();
</script>
`;

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "meter.html"), page);
console.log("Wrote the review page -> exploration/priority/meter.html");
