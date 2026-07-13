// gen-brandmark.mjs - THE brandmark harness (canonical home: the
// kangentic-branding repo). Renders K-disc brandmark concepts, contact
// sheets judged at 192px AND small strips on cream and warm-black grounds,
// and exports the canonical two-tier marks into assets/.
//
// Usage: npm run gen   (or node scripts/gen-brandmark.mjs)
// Output: exploration/icon-concepts/ (sheets + concepts), assets/ (canon)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  CREAM, INK, RUST, AMBER,
  fontK, geoK, halfplane,
  ARM_A, ARM_D, CUT_CANON, CUT_SMALL,
  bandRect, kWithGap, tipClipped, fontKSplit,
  enlarged, knockout,
  CARD_MARGIN, tightCardK, f4kParts, f4kMonoSvg, kOnDisc,
} from "./lib/mark.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "exploration", "icon-concepts");
const ASSETS = join(ROOT, "assets");

// Chunky pixel K (8 wide x 10 tall), same glyph as the logo-pixel candidate.
const PIXEL_K = [
  "##....##", "##...##.", "##..##..", "##.##...", "####....",
  "####....", "##.##...", "##..##..", "##...##.", "##....##",
];

function pixelKRects(fill, unit, ox, oy) {
  const out = [];
  PIXEL_K.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "#") { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === "#") run++;
      out.push(`<rect x="${ox + x * unit}" y="${oy + y * unit}" width="${run * unit}" height="${unit}" fill="${fill}"/>`);
      x += run;
    }
  });
  return `<g shape-rendering="crispEdges">${out.join("")}</g>`;
}

// Smooth geometric K: stem + two diagonal strokes, square caps (like the
// current production mark, re-proportioned).
// A diagonal bar as an exact polygon (perpendicular end cuts, no stroke
// caps - stroke caps overshoot the stem and leave a nub at the joint).
function bar(x0, y0, x1, y1, halfW) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const px = (-dy / len) * halfW;
  const py = (dx / len) * halfW;
  return `${x0 + px},${y0 + py} ${x1 + px},${y1 + py} ${x1 - px},${y1 - py} ${x0 - px},${y0 - py}`;
}

// K v5: the frozen Microsoft Tai Le Bold "K", the split-tip system, and
// the disc enlargement all live in scripts/lib/mark.mjs (imported above) -
// no geometry may be re-declared here.

// Disc + optional ring + glyph. Glyph: "pixel" | "geo".
function mark(size, { disc, ring, glyph, glyphColor }) {
  const c = size / 2;
  const ringW = ring ? Math.max(1, Math.round(size / 28)) : 0;
  const ringSvg = ring
    ? `<circle cx="${c}" cy="${c}" r="${c - ringW / 2 - Math.max(1, size * 0.01)}" fill="none" stroke="${ring}" stroke-width="${ringW}"/>`
    : "";
  let glyphSvg;
  if (glyph === "pixel") {
    // 8x10 glyph, ~62% of diameter tall, integer unit
    const unit = Math.max(1, Math.floor((size * 0.62) / 10));
    const ox = Math.round((size - 8 * unit) / 2);
    const oy = Math.round((size - 10 * unit) / 2);
    glyphSvg = pixelKRects(glyphColor, unit, ox, oy);
  } else {
    glyphSvg = `<g transform="translate(${-0.09 * size},${-0.09 * size}) scale(1.18)">${geoK(glyphColor, size)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${c}" cy="${c}" r="${c}" fill="${disc}"/>
    ${ringSvg}
    ${glyphSvg}
  </svg>`;
}

const CONCEPTS = [
  { name: "a-rust-geo", label: "A rust disc + cream K (geo)", spec: { disc: RUST, glyph: "geo", glyphColor: CREAM } },
  { name: "b-rust-pixel", label: "B rust disc + cream K (pixel)", spec: { disc: RUST, glyph: "pixel", glyphColor: CREAM } },
  { name: "c-card-pixel", label: "C cream disc + rust ring + ink K (pixel)", spec: { disc: CREAM, ring: RUST, glyph: "pixel", glyphColor: INK } },
  { name: "d-card-geo", label: "D cream disc + rust ring + rust K (geo)", spec: { disc: CREAM, ring: RUST, glyph: "geo", glyphColor: RUST } },
  { name: "e-amber-pixel", label: "E amber disc + ink K (pixel)", spec: { disc: AMBER, glyph: "pixel", glyphColor: INK } },
  { name: "g-amber-geo", label: "G amber disc + ink K (geo)", spec: { disc: AMBER, glyph: "geo", glyphColor: INK } },
  { name: "f-ink-geo", label: "F ink disc + cream ring + amber K (geo)", spec: { disc: INK, ring: CREAM, glyph: "geo", glyphColor: AMBER } },
  { name: "h-ink-pixel", label: "H ink disc + cream ring + amber K (pixel)", spec: { disc: INK, ring: CREAM, glyph: "pixel", glyphColor: AMBER } },
];

await mkdir(OUT, { recursive: true });

// Individual 512s for close inspection
for (const c of CONCEPTS) {
  await sharp(Buffer.from(mark(512, c.spec))).png().toFile(join(OUT, `${c.name}.png`));
}

// Sheet: per concept row -> 192 on cream, 192 on dark, 48/32/16 strip on each
const ROW = 260;
const COLW = [250, 250, 190, 190];
const W = COLW.reduce((a, b) => a + b, 0) + 60;
async function b64(size, spec) {
  return (await sharp(Buffer.from(mark(size, spec))).png().toBuffer()).toString("base64");
}
const rows = [];
for (let i = 0; i < CONCEPTS.length; i++) {
  const { label, spec } = CONCEPTS[i];
  const y = i * ROW;
  const big = await b64(192, spec);
  const s48 = await b64(48, spec);
  const s32 = await b64(32, spec);
  const s16 = await b64(16, spec);
  const strip = (x0, ty) => `
    <image x="${x0}" y="${ty + 60}" width="48" height="48" href="data:image/png;base64,${s48}"/>
    <image x="${x0 + 64}" y="${ty + 76}" width="32" height="32" href="data:image/png;base64,${s32}"/>
    <image x="${x0 + 112}" y="${ty + 92}" width="16" height="16" href="data:image/png;base64,${s16}"/>`;
  rows.push(`
    <rect x="0" y="${y}" width="${COLW[0] + 20}" height="${ROW}" fill="${CREAM}"/>
    <rect x="${COLW[0] + 20}" y="${y}" width="${COLW[1]}" height="${ROW}" fill="#1d1915"/>
    <rect x="${COLW[0] + COLW[1] + 20}" y="${y}" width="${COLW[2]}" height="${ROW}" fill="${CREAM}"/>
    <rect x="${COLW[0] + COLW[1] + COLW[2] + 20}" y="${y}" width="${COLW[3] + 40}" height="${ROW}" fill="#1d1915"/>
    <image x="30" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    <image x="${COLW[0] + 50}" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    ${strip(COLW[0] + COLW[1] + 40, y)}
    ${strip(COLW[0] + COLW[1] + COLW[2] + 40, y)}
    <text x="30" y="${y + 236}" font-family="monospace" font-size="16" fill="#6e6659">${label}</text>`);
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROW * CONCEPTS.length}">${rows.join("\n")}</svg>`;
await sharp(Buffer.from(sheet)).png().toFile(join(OUT, "_sheet.png"));
console.log(`Wrote ${CONCEPTS.length} brandmark concepts to ${OUT}`);

// ============================================================================
// Round 2: abstract K marks built from the product's anatomy (cards, columns,
// drag, status lamp). Between "plain K" and "sprite": still reads as a K,
// but it is unmistakably Kangentic's K.
// ============================================================================
const disc = (size, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${RUST}"/>
    <g transform="scale(${size / 100})">${inner}</g>
  </svg>`;

// 1. CARDS-K: the K assembled from three card-bars with joint gaps.
function cardsK() {
  const stem = `<rect x="28" y="24" width="13" height="52" rx="2.5" fill="${CREAM}"/>`;
  const upper = `<rect x="41" y="31.5" width="31" height="13" rx="2.5" fill="${CREAM}" transform="rotate(-40 56.5 38)"/>`;
  const lower = `<rect x="41" y="55.5" width="31" height="13" rx="2.5" fill="${CREAM}" transform="rotate(40 56.5 62)"/>`;
  return stem + upper + lower;
}

// 2. CARD-K: a cream task card with the K knocked out in disc rust.
// Card at 56 units (was 50) so it claims more of the disc.
function cardK() {
  const card = `<rect x="22" y="22" width="56" height="56" rx="8" fill="${CREAM}"/>`;
  const k = `<g transform="translate(12.5,12.5) scale(0.75)">${geoK(RUST, 100)}</g>`;
  return card + k;
}

// 3. DRAG-K: the K releasing a small card chip from its upper arm.
function dragK() {
  const stem = `<rect x="30" y="23" width="12.5" height="54" fill="${CREAM}"/>`;
  const upper = `<polygon points="${bar(36.5, 49.5, 55.5, 33, 6.25)}" fill="${CREAM}"/>`;
  const lower = `<polygon points="${bar(36.5, 48.5, 67.5, 74.5, 6.25)}" fill="${CREAM}"/>`;
  const chip = `<rect x="60" y="20" width="14" height="11" rx="2.5" fill="${CREAM}"/>`;
  return stem + upper + lower + chip;
}

// 4. STATUS-K: the K's upper arm ends in an amber agent lamp.
// "square" tip variants: the lamp is a square matching the K's terminals -
// angled (parallel to the arm's cut, reads as a mini-card in flight) or
// axis-aligned.
// statusK now means "the split font K": body + severed amber arm-end.
// The tip-style parameter is retained for call compatibility but the cut
// is always the arm's own end.
function statusK(_tip = "arm", kFill = CREAM, tipFill = AMBER) {
  return fontKSplit(kFill, tipFill);
}

// 5. BOARD GLYPH (no letter): three columns, middle card mid-drop.
// Amber card sized to survive 16px.
function boardGlyph() {
  return `
    <rect x="27" y="25" width="12.5" height="44" rx="3" fill="${CREAM}"/>
    <rect x="43.5" y="25" width="12.5" height="24" rx="3" fill="${CREAM}"/>
    <rect x="43.5" y="55" width="12.5" height="14" rx="3" fill="${AMBER}"/>
    <rect x="60" y="25" width="12.5" height="44" rx="3" fill="${CREAM}"/>`;
}

// 6. CARD PINWHEEL (no letter): four task cards in rotation around the
// center, one amber. v2: chunkier cards, pulled tighter to center, so the
// pinwheel still reads at 32/16 instead of dissolving into dots.
function pinwheel() {
  // Blocks widened/tallened so the inter-card whitespace is halved
  // (gap 7.5 -> 3.8): reads as one rotating unit, not four islands.
  const card = (fill, angle) =>
    `<rect x="47" y="25.2" width="28.5" height="18" rx="4" fill="${fill}" transform="rotate(${angle} 50 50)"/>`;
  return card(CREAM, 0) + card(CREAM, 90) + card(CREAM, 180) + card(AMBER, 270);
}

// 7. ORBIT (no letter): three cards orbiting one amber agent-center - the
// command center with work in flight around it.
function orbit() {
  const card = (angle) =>
    `<g transform="rotate(${angle} 50 50)"><rect x="40" y="19" width="20" height="11" rx="3" fill="${CREAM}"/></g>`;
  return `<circle cx="50" cy="50" r="8" fill="${AMBER}"/>` + card(0) + card(120) + card(240);
}

// F1 tip variants: the Status-K detached-tip gesture INSIDE the card.
// F1b: amber tip (like F2). F1c: monochrome - rust tip, the cream gap
// between arm and tip does the styling, no amber.
function cardKTip(tipFill) {
  const card = `<rect x="22" y="22" width="56" height="56" rx="8" fill="${CREAM}"/>`;
  const k = `<g transform="translate(12.5,12.5) scale(0.75)">${statusK("angled", RUST, tipFill)}</g>`;
  return card + k;
}

const ABSTRACT = [
  { name: "f1-card-k", label: "F1 CARD-K", inner: enlarged(cardK()) },
  { name: "f1b-card-k-amber-tip", label: "F1b CARD-K, amber tip (F2 style)", inner: enlarged(cardKTip(AMBER)) },
  { name: "f1c-card-k-rust-tip", label: "F1c CARD-K, rust tip (no amber)", inner: enlarged(cardKTip(RUST)) },
  { name: "f2-status-k-angled", label: "F2 STATUS-K (severed arm tip)", inner: enlarged(statusK()) },
  { name: "f4-board-glyph", label: "F4 BOARD GLYPH", inner: enlarged(boardGlyph()) },
  { name: "f5-pinwheel-v2", label: "F5 CARD PINWHEEL v2", inner: enlarged(pinwheel()) },
];

for (const c of ABSTRACT) {
  await sharp(Buffer.from(disc(512, c.inner))).png().toFile(join(OUT, `${c.name}.png`));
}
const rows2 = [];
for (let i = 0; i < ABSTRACT.length; i++) {
  const { label, inner } = ABSTRACT[i];
  const y = i * ROW;
  const png = async (sz) => (await sharp(Buffer.from(disc(sz, inner))).png().toBuffer()).toString("base64");
  const big = await png(192);
  const s48 = await png(48);
  const s32 = await png(32);
  const s16 = await png(16);
  const strip = (x0, ty) => `
    <image x="${x0}" y="${ty + 60}" width="48" height="48" href="data:image/png;base64,${s48}"/>
    <image x="${x0 + 64}" y="${ty + 76}" width="32" height="32" href="data:image/png;base64,${s32}"/>
    <image x="${x0 + 112}" y="${ty + 92}" width="16" height="16" href="data:image/png;base64,${s16}"/>`;
  rows2.push(`
    <rect x="0" y="${y}" width="${COLW[0] + 20}" height="${ROW}" fill="${CREAM}"/>
    <rect x="${COLW[0] + 20}" y="${y}" width="${COLW[1]}" height="${ROW}" fill="#1d1915"/>
    <rect x="${COLW[0] + COLW[1] + 20}" y="${y}" width="${COLW[2]}" height="${ROW}" fill="${CREAM}"/>
    <rect x="${COLW[0] + COLW[1] + COLW[2] + 20}" y="${y}" width="${COLW[3] + 40}" height="${ROW}" fill="#1d1915"/>
    <image x="30" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    <image x="${COLW[0] + 50}" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    ${strip(COLW[0] + COLW[1] + 40, y)}
    ${strip(COLW[0] + COLW[1] + COLW[2] + 40, y)}
    <text x="30" y="${y + 236}" font-family="monospace" font-size="16" fill="#6e6659">${label}</text>`);
}
const sheet2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROW * ABSTRACT.length}">${rows2.join("\n")}</svg>`;
await sharp(Buffer.from(sheet2)).png().toFile(join(OUT, "_sheet-finalists.png"));
console.log(`Wrote ${ABSTRACT.length} finalist marks and _sheet-finalists.png`);

// ============================================================================
// Round 4: KNOCKOUT versions. Like the current production logo, the marks'
// cream interiors become true alpha holes so the theme background flows
// through; the rust disc and all amber elements stay filled. Card-K family:
// the card becomes the hole, the rust K (+ tip) floats inside it.
// ============================================================================
const tipAngled = (fill) => tipClipped(fill);
const tipAxis = (fill) => tipClipped(fill);
// For knockout masks: K painted as a hole, then the gap band restored to
// disc (white in mask luminance terms) - paint order does the work, no
// nested masks needed.
const kBodyShort = (fill) => fontK(fill) + bandRect(fill === "#000" ? "#fff" : "#000");

// knockout() lives in lib/mark.mjs: holes100/filled100 are shapes in the
// 100-box; holes must use fill="#000".
const CARD_HOLE = `<rect x="22" y="22" width="56" height="56" rx="8" fill="#000"/>`;
const inCard = (svg) => `<g transform="translate(12.5,12.5) scale(0.75)">${svg}</g>`;

const KNOCKOUTS = [
  { name: "f1-knockout", label: "F1k CARD-K (card hole, K floats)",
    holes: enlarged(CARD_HOLE), filled: enlarged(inCard(geoK(RUST, 100))) },
  { name: "f1b-knockout", label: "F1bk CARD-K amber tip (card hole)",
    holes: enlarged(CARD_HOLE), filled: enlarged(inCard(fontKSplit(RUST, AMBER))) },
  { name: "f1c-knockout", label: "F1ck CARD-K rust tip (card hole)",
    holes: enlarged(CARD_HOLE), filled: enlarged(inCard(fontKSplit(RUST, RUST))) },
  { name: "f2-knockout", label: "F2k STATUS-K (K is the hole, amber tip)",
    holes: enlarged(kBodyShort("#000")), filled: enlarged(tipAngled(AMBER)) },
  { name: "f4-knockout", label: "F4k BOARD GLYPH (columns are holes)",
    ...(({ holes, filled }) => ({ holes, filled }))(f4kParts()) },
  { name: "f5-knockout", label: "F5k PINWHEEL (cards are holes)",
    holes: enlarged([0, 90, 180].map((a) => `<rect x="47" y="25.2" width="28.5" height="18" rx="4" fill="#000" transform="rotate(${a} 50 50)"/>`).join("")),
    filled: enlarged(`<rect x="47" y="25.2" width="28.5" height="18" rx="4" fill="${AMBER}" transform="rotate(270 50 50)"/>`) },
];

for (const k of KNOCKOUTS) {
  await sharp(Buffer.from(knockout(512, k.holes, k.filled))).png().toFile(join(OUT, `${k.name}.png`));
}

// Comparison sheet on pure white and pure black
const rows3 = [];
for (let i = 0; i < KNOCKOUTS.length; i++) {
  const { label, holes, filled } = KNOCKOUTS[i];
  const y = i * ROW;
  const png = async (sz) => (await sharp(Buffer.from(knockout(sz, holes, filled))).png().toBuffer()).toString("base64");
  const big = await png(192);
  const s48 = await png(48);
  const s32 = await png(32);
  const s16 = await png(16);
  const strip = (x0, ty) => `
    <image x="${x0}" y="${ty + 60}" width="48" height="48" href="data:image/png;base64,${s48}"/>
    <image x="${x0 + 64}" y="${ty + 76}" width="32" height="32" href="data:image/png;base64,${s32}"/>
    <image x="${x0 + 112}" y="${ty + 92}" width="16" height="16" href="data:image/png;base64,${s16}"/>`;
  rows3.push(`
    <rect x="0" y="${y}" width="${COLW[0] + 20}" height="${ROW}" fill="#ffffff"/>
    <rect x="${COLW[0] + 20}" y="${y}" width="${COLW[1]}" height="${ROW}" fill="#000000"/>
    <rect x="${COLW[0] + COLW[1] + 20}" y="${y}" width="${COLW[2]}" height="${ROW}" fill="#ffffff"/>
    <rect x="${COLW[0] + COLW[1] + COLW[2] + 20}" y="${y}" width="${COLW[3] + 40}" height="${ROW}" fill="#000000"/>
    <image x="30" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    <image x="${COLW[0] + 50}" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    ${strip(COLW[0] + COLW[1] + 40, y)}
    ${strip(COLW[0] + COLW[1] + COLW[2] + 40, y)}
    <text x="30" y="${y + 236}" font-family="monospace" font-size="16" fill="#6e6659">${label}</text>`);
}
const sheet3 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROW * KNOCKOUTS.length}">${rows3.join("\n")}</svg>`;
await sharp(Buffer.from(sheet3)).png().toFile(join(OUT, "_sheet-knockout.png"));
console.log(`Wrote ${KNOCKOUTS.length} knockout marks and _sheet-knockout.png`);

// --- The isolated candidate sheet: F1bk / F4k / F5k only --------------------
const CANDIDATE_NAMES = ["f1b-knockout", "f4-knockout", "f5-knockout"];
const candidates = KNOCKOUTS.filter((k) => CANDIDATE_NAMES.includes(k.name));
const rows4 = [];
for (let i = 0; i < candidates.length; i++) {
  const { label, holes, filled } = candidates[i];
  const y = i * ROW;
  const png = async (sz) => (await sharp(Buffer.from(knockout(sz, holes, filled))).png().toBuffer()).toString("base64");
  const big = await png(192);
  const s48 = await png(48);
  const s32 = await png(32);
  const s16 = await png(16);
  const strip = (x0, ty) => `
    <image x="${x0}" y="${ty + 60}" width="48" height="48" href="data:image/png;base64,${s48}"/>
    <image x="${x0 + 64}" y="${ty + 76}" width="32" height="32" href="data:image/png;base64,${s32}"/>
    <image x="${x0 + 112}" y="${ty + 92}" width="16" height="16" href="data:image/png;base64,${s16}"/>`;
  rows4.push(`
    <rect x="0" y="${y}" width="${COLW[0] + 20}" height="${ROW}" fill="#ffffff"/>
    <rect x="${COLW[0] + 20}" y="${y}" width="${COLW[1]}" height="${ROW}" fill="#000000"/>
    <rect x="${COLW[0] + COLW[1] + 20}" y="${y}" width="${COLW[2]}" height="${ROW}" fill="#ffffff"/>
    <rect x="${COLW[0] + COLW[1] + COLW[2] + 20}" y="${y}" width="${COLW[3] + 40}" height="${ROW}" fill="#000000"/>
    <image x="30" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    <image x="${COLW[0] + 50}" y="${y + 18}" width="192" height="192" href="data:image/png;base64,${big}"/>
    ${strip(COLW[0] + COLW[1] + 40, y)}
    ${strip(COLW[0] + COLW[1] + COLW[2] + 40, y)}
    <text x="30" y="${y + 236}" font-family="monospace" font-size="16" fill="#6e6659">${label}</text>`);
}
const sheet4 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROW * candidates.length}">${rows4.join("\n")}</svg>`;
await sharp(Buffer.from(sheet4)).png().toFile(join(OUT, "_sheet-candidates.png"));
console.log(`Wrote the isolated candidate sheet (_sheet-candidates.png): ${CANDIDATE_NAMES.join(", ")}`);

// --- Portable SVG exports for the candidates (font-independent: the K is
// baked path data). knockout() output IS a standalone SVG document. -------
for (const k of candidates) {
  await writeFile(join(OUT, `${k.name}.svg`), knockout(512, k.holes, k.filled));
}
// Filled F1b as well (fixed-appearance contexts like stores).
await writeFile(
  join(OUT, "f1b-filled.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256" fill="${RUST}"/><g transform="scale(5.12)">${enlarged(cardKTip(AMBER))}</g></svg>`
);
console.log("Wrote portable SVGs: f1b-knockout.svg, f4-knockout.svg, f5-knockout.svg, f1b-filled.svg");

// ============================================================================
// TIGHT CARD (2026-07-12): the original 56-unit card quoted the F1
// concept and left 7-13 units of uneven cream margin around the K - dead
// pixels at icon sizes. tightCardK() (lib/mark.mjs) derives the card FROM
// the glyph bbox plus an even margin, auto-scaled so the card corners sit
// CARD_RING units inside the disc.
// ============================================================================

// --- Compare sheet: current geometry vs tight margins, judged small-first --
const f1bkCanon = candidates.find((c) => c.name === "f1b-knockout");
const oldSmall = {
  holes: enlarged(CARD_HOLE),
  filled: enlarged(inCard(fontKSplit(RUST, AMBER, 1, CUT_SMALL))),
};
const compareRows = [
  { label: "CURRENT canon cut (reference)", holes: f1bkCanon.holes, filled: f1bkCanon.filled },
  { label: "CURRENT small cut (nav today)", holes: oldSmall.holes, filled: oldSmall.filled },
  ...[6, 5, 4].map((m) => {
    const t = tightCardK(m, CUT_SMALL);
    return { label: `TIGHT margin ${m}, small cut`, holes: t.hole, filled: t.filled };
  }),
  (() => {
    const t = tightCardK(5, CUT_CANON);
    return { label: "TIGHT margin 5, canon cut", holes: t.hole, filled: t.filled };
  })(),
];
const CSZ = [96, 48, 32, 26, 24, 16];
let crows = "";
for (let i = 0; i < compareRows.length; i++) {
  const r = compareRows[i];
  const y = i * 200;
  crows += `<rect x="0" y="${y}" width="450" height="200" fill="#f6f1e8"/>
    <rect x="450" y="${y}" width="450" height="200" fill="#1d1915"/>`;
  let px = 30;
  for (const sz of CSZ) {
    const b64i = (await sharp(Buffer.from(knockout(sz, r.holes, r.filled))).png().toBuffer()).toString("base64");
    crows += `<image x="${px}" y="${y + 40 + (96 - sz)}" width="${sz}" height="${sz}" href="data:image/png;base64,${b64i}"/>
      <image x="${450 + px}" y="${y + 40 + (96 - sz)}" width="${sz}" height="${sz}" href="data:image/png;base64,${b64i}"/>`;
    px += sz + 24;
  }
  crows += `<text x="30" y="${y + 180}" font-family="monospace" font-size="15" fill="#6e6659">${r.label}</text>`;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${compareRows.length * 200}">${crows}</svg>`))
  .png().toFile(join(OUT, "_card-tight-compare.png"));
console.log("Wrote _card-tight-compare.png (current vs tight margins)");

// --- Final F1bk exports: tight card at CARD_MARGIN, both cuts. These
// overwrite the classic-geometry f1b SVGs written by the candidate loop
// above (the loop stays for the historical sheets).
const tCanon = tightCardK(CARD_MARGIN, CUT_CANON);
const tSmall = tightCardK(CARD_MARGIN, CUT_SMALL);
await writeFile(join(OUT, "f1b-knockout.svg"), knockout(512, tCanon.hole, tCanon.filled));
await writeFile(join(OUT, "f1b-knockout-small.svg"), knockout(512, tSmall.hole, tSmall.filled));
await writeFile(
  join(OUT, "f1b-filled.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256" fill="${RUST}"/><g transform="scale(5.12)">${tCanon.filledCard}</g></svg>`
);
console.log(`Wrote tight-card F1bk exports (margin ${CARD_MARGIN}): f1b-knockout.svg, f1b-knockout-small.svg, f1b-filled.svg`);

// ============================================================================
// SMALL-MARK RESCUE (2026-07-12): even with the tight card, the K is
// hard to see at nav size. Root cause is structural: the K is the SAME RUST
// as the disc ring, so at 24-26px the eye merges K and ring and reads the
// cream window as the figure ("an O with a slot"). Three figure-ground flips
// (ring -> window -> K -> tip) is too many for 26px. Options that cut a flip:
//   R1  drop the card: K IS the hole in the disc (theme flows through the K)
//   R2  drop the card: solid rust disc, CREAM K painted, amber tip
//   R3  keep the card: K in INK so it can't merge with the ring
// R1/R2: with no card, the glyph re-scales to claim the disc directly.
// ============================================================================
// kOnDisc (lib/mark.mjs) scales the bare glyph to claim the disc directly.
// R1 knockout parts: K painted as hole, gap band restored to disc, tip amber.
const r1 = {
  holes: kOnDisc(fontK("#000") + bandRect("#fff", 1, CUT_SMALL)),
  filled: kOnDisc(tipClipped(AMBER, 1, CUT_SMALL)),
};
// R2 filled: background-agnostic split K in cream on the rust disc.
const r2Filled = kOnDisc(fontKSplit(CREAM, AMBER, 1, CUT_SMALL));
// R3: tight card, ink K.
const r3 = tightCardK(CARD_MARGIN, CUT_SMALL, INK);

const RESCUE = [
  { label: "REF tight card m5 (in nav now)", holes: tSmall.hole, filled: tSmall.filled },
  { label: "R1 K-hole disc (theme through K)", holes: r1.holes, filled: r1.filled },
  { label: "R2 rust disc, cream K", holes: "", filled: r2Filled },
  { label: "R3 tight card, INK K", holes: r3.hole, filled: r3.filled },
];

const RSZ = [96, 48, 32, 26, 24, 16];
const ZOOM = 8;
let rrows = "";
for (let i = 0; i < RESCUE.length; i++) {
  const r = RESCUE[i];
  const y = i * 260;
  rrows += `<rect x="0" y="${y}" width="640" height="260" fill="#f6f1e8"/>
    <rect x="640" y="${y}" width="640" height="260" fill="#1d1915"/>`;
  for (const half of [0, 1]) {
    let px = 640 * half + 24;
    for (const sz of RSZ) {
      const b64i = (await sharp(Buffer.from(knockout(sz, r.holes, r.filled))).png().toBuffer()).toString("base64");
      rrows += `<image x="${px}" y="${y + 20 + (96 - sz)}" width="${sz}" height="${sz}" href="data:image/png;base64,${b64i}"/>`;
      px += sz + 18;
    }
    // 24px render, x8 nearest zoom, pixel-truth panel
    const small = await sharp(Buffer.from(knockout(24, r.holes, r.filled))).png().toBuffer();
    const zoomed = (await sharp(small).resize(24 * ZOOM, 24 * ZOOM, { kernel: "nearest" }).png().toBuffer()).toString("base64");
    rrows += `<image x="${px}" y="${y + 20}" width="${24 * ZOOM}" height="${24 * ZOOM}" href="data:image/png;base64,${zoomed}"/>`;
  }
  rrows += `<text x="24" y="${y + 244}" font-family="monospace" font-size="15" fill="#6e6659">${r.label}</text>`;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${RESCUE.length * 260}">${rrows}</svg>`))
  .png().toFile(join(OUT, "_small-rescue.png"));
console.log("Wrote _small-rescue.png (REF / R1 K-hole / R2 cream K / R3 ink K, with x8 zoom of 24px)");

// --- Small-mark exports: R1 is the small-display companion of F1bk. The
// two-tier system: >=48px = card-K knockout (f1b-knockout.svg), <48px =
// K-hole disc (kdisc-knockout.svg). R2 is the fixed-appearance rendition
// for small rasters on unknown grounds.
await writeFile(join(OUT, "kdisc-knockout.svg"), knockout(512, r1.holes, r1.filled));
await writeFile(
  join(OUT, "kdisc-filled.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256" fill="${RUST}"/><g transform="scale(5.12)">${r2Filled}</g></svg>`
);
console.log("Wrote small-mark exports: kdisc-knockout.svg (theme-following), kdisc-filled.svg (fixed)");

// ============================================================================
// CANONICAL ASSETS (assets/ - what consumers ship). The two-tier mark:
//   brandmark.svg        card-K knockout, large in-page display (F1bk)
//   brandmark-small.svg  F4k board glyph knockout, the app icon
//                        (the selected small-display mark)
//   brandmark-filled.svg card-K fixed-appearance (stores / unknown grounds)
//   brandmark-mono.svg   F4k in one currentColor (columns AND card are
//                        alpha holes) for consumer-themed in-app chrome
// ============================================================================
await mkdir(ASSETS, { recursive: true });
const f4k = KNOCKOUTS.find((k) => k.name === "f4-knockout");
await writeFile(join(ASSETS, "brandmark.svg"), knockout(512, tCanon.hole, tCanon.filled));
await writeFile(join(ASSETS, "brandmark-small.svg"), knockout(512, f4k.holes, f4k.filled));
await writeFile(
  join(ASSETS, "brandmark-filled.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256" fill="${RUST}"/><g transform="scale(5.12)">${tCanon.filledCard}</g></svg>`
);
await writeFile(join(ASSETS, "brandmark-mono.svg"), f4kMonoSvg());
console.log("Wrote canonical assets/: brandmark.svg, brandmark-small.svg, brandmark-filled.svg, brandmark-mono.svg");
