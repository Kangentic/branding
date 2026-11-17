// gen-pointer.mjs - the demo pointer: the dot and its click, drawn by
// kangentic.com's hero and the app's web demo.
//
// Writes:
//   assets/pointer/pointer.svg        the dot (core + halo), currentColor
//   assets/pointer/pointer-ring.svg   the ring a press leaves, currentColor
//   assets/pointer/pointer.json       the manifest: units, tones, the click as data
//   exploration/pointer/_sheet-*.png  the review sheets (NOT shipped)
//
// All geometry and motion come from lib/pointer.mjs. This file declares none.
//
// Usage: npm run gen:pointer   (or node scripts/gen-pointer.mjs)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CREAM, INK, INK_SOFT, PANEL, RUST } from "./lib/mark.mjs";
import {
  DOT_BOX,
  DOT_FILE,
  MANIFEST_FILE,
  POP,
  RING_FILE,
  TONES,
  clickAt,
  manifest,
  pointerRasterSvg,
  pointerRingSvg,
  pointerSvg,
} from "./lib/pointer.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIP = join(ROOT, "assets", "pointer");
const OUT = join(ROOT, "exploration", "pointer");

// ---------------------------------------------------------------------------
// The shipped files.
// ---------------------------------------------------------------------------

await mkdir(SHIP, { recursive: true });
await writeFile(join(SHIP, DOT_FILE), pointerSvg() + "\n");
await writeFile(join(SHIP, RING_FILE), pointerRingSvg() + "\n");
await writeFile(join(SHIP, MANIFEST_FILE), JSON.stringify(manifest(), null, 2) + "\n");
console.log(`Wrote ${DOT_FILE} + ${RING_FILE} + ${MANIFEST_FILE} -> assets/pointer/`);

// ---------------------------------------------------------------------------
// Review sheets. Artifacts under exploration/, so NOT held to byte determinism.
//
// Every frame is drawn from pointerRasterSvg() at a moment clickAt() samples
// from the shipped constants, so what the sheet shows is the data, not a
// redrawing of it. Pixel tiles rasterize FIRST and upscale in a second sharp
// pipeline: a one-step resize re-renders the vector and shows no pixels (the
// lesson recorded in activity-icon-geometry.md).
// ---------------------------------------------------------------------------

await mkdir(OUT, { recursive: true });

// The grounds the dot actually sits on. Dark: the terminal's fixed #0c0c0c (the
// reason tone follows the ground, D4), a dark app surface, and the rust stage
// the hero ships on. Light: the cream page and the panel.
const SHEETS = [
  {
    id: "dark",
    tone: "cream",
    bg: "#141110",
    fg: "#f2ede4",
    soft: "#8a8378",
    grounds: [
      { hex: "#0c0c0c", label: "terminal #0c0c0c" },
      { hex: "#1d1915", label: "dark surface" },
      { hex: RUST, label: "rust, hero stage" },
    ],
  },
  {
    id: "light",
    tone: "ink",
    bg: "#e6dfd2",
    fg: INK,
    soft: INK_SOFT,
    grounds: [
      { hex: CREAM, label: "cream page" },
      { hex: PANEL, label: "panel" },
      { hex: "#efeae1", label: "header" },
    ],
  },
];

// The demo holds a click's press for 90ms (the hero about 152ms). The hold is
// the consumer's, so the strip marks which frames fall inside the demo's.
const DEMO_PRESS_MS = 90;
const STRIP_MS = [0, 40, 80, 160, 240, 320, 400, 480];
// Today's hero aura, drawn only in the before/after band (D2 B removed it).
const HERO_AURA = { d: 30, opacity: 0.12 };

const W = 960;
const PAD = 24;
const ZOOM = 8;

// Place a raster svg document centered on (cx, cy) inside the sheet.
const place = (svg, cx, cy) => {
  const w = +/width="([\d.]+)"/.exec(svg)[1];
  const h = +/height="([\d.]+)"/.exec(svg)[1];
  return svg.replace("<svg ", `<svg x="${cx - w / 2}" y="${cy - h / 2}" `);
};

// Rasterize at true size FIRST, then upscale with nearest in a second pipeline.
const pixelTile = async (svg, tile) =>
  sharp(await sharp(Buffer.from(svg)).png().toBuffer()).resize(tile, tile, { kernel: "nearest" }).png().toBuffer();

for (const s of SHEETS) {
  const t = TONES[s.tone];
  // Label color on a tile of the sheet's tone family.
  const onTile = (hex) => (hex === s.bg ? s.soft : t.color === CREAM ? "#d9d2c5" : INK_SOFT);
  const rows = [];
  const composites = [];
  let y = PAD;
  const text = (x, yy, str, { size = 12, fill = s.soft, anchor = "start" } = {}) =>
    rows.push(`<text x="${x}" y="${yy}" text-anchor="${anchor}" font-family="monospace" font-size="${size}" fill="${fill}">${str}</text>`);
  const caption = (str) => {
    text(PAD, y, str);
    y += 16;
  };

  text(PAD, y + 4, `demo pointer - ${s.tone} on ${s.id} grounds (cream below luminance 0.4, ink above)`, { size: 14, fill: s.fg });
  y += 30;

  // 1. True size on the grounds it meets.
  caption("true size, at rest - page px at host scale 1; the same dot at every frame scale (D1 B)");
  s.grounds.forEach((g, i) => {
    const x = PAD + i * 300;
    rows.push(`<rect x="${x}" y="${y}" width="280" height="80" rx="6" fill="${g.hex}"/>`);
    rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone }), x + 60, y + 40));
    rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone, pressed: true }), x + 130, y + 40));
    text(x + 160, y + 36, g.label, { fill: onTile(g.hex), size: 11 });
    text(x + 160, y + 52, "rest | held press", { fill: onTile(g.hex), size: 10 });
  });
  y += 100;

  // 2. The click, frame by frame, on the first ground.
  caption(`one press, sampled from the shipped tracks (pop ${POP.upMs}+${POP.settleMs}ms, ring 450ms, fade 400ms); core pressed while the demo holds (${DEMO_PRESS_MS}ms)`);
  const ground = s.grounds[0].hex;
  const cell = 110;
  rows.push(`<rect x="${PAD}" y="${y}" width="${STRIP_MS.length * cell}" height="${cell}" rx="6" fill="${ground}"/>`);
  STRIP_MS.forEach((ms, i) => {
    const c = clickAt(ms);
    const cx = PAD + i * cell + cell / 2;
    rows.push(
      place(
        pointerRasterSvg({
          color: t.color,
          tone: s.tone,
          pressed: ms < DEMO_PRESS_MS,
          pop: c.pop,
          ringD: c.ringD,
          ringOpacity: c.ringOpacity,
        }),
        cx,
        y + cell / 2,
      ),
    );
    text(cx, y + cell + 14, `${ms}ms`, { anchor: "middle", size: 10 });
  });
  y += cell + 34;

  // 3. A drag: the grab is a press (squash, pop, ring at the grab point), the
  //    carry holds the squash, the drop is a release with no ring (D5 A).
  caption("a drag (D5 A) - grab: a press and its ring | carry: core held at 0.7, ring left behind | drop: a release, no ring");
  rows.push(`<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="110" rx="6" fill="${ground}"/>`);
  const grab = clickAt(160);
  const left = clickAt(320);
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone, pressed: true, pop: grab.pop, ringD: grab.ringD, ringOpacity: grab.ringOpacity }), PAD + 110, y + 55));
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone, dot: false, ringD: left.ringD, ringOpacity: left.ringOpacity }), PAD + 330, y + 55));
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone, pressed: true }), PAD + 470, y + 55));
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone }), PAD + 750, y + 55));
  text(PAD + 110, y + 104, "grab +160ms", { anchor: "middle", size: 10 });
  text(PAD + 400, y + 104, "carry: ring stays where it landed", { anchor: "middle", size: 10 });
  text(PAD + 750, y + 104, "drop", { anchor: "middle", size: 10 });
  y += 130;

  // 4. Before and after: today's hero carries a 30px aura; the shipped dot has none (D2 B).
  caption("before | after - today's hero dot with its 30px aura at 12% | the shipped dot (2B drops the aura)");
  const heroGround = s.id === "dark" ? RUST : CREAM;
  rows.push(`<rect x="${PAD}" y="${y}" width="420" height="90" rx="6" fill="${heroGround}"/>`);
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone, aura: HERO_AURA }), PAD + 110, y + 45));
  rows.push(place(pointerRasterSvg({ color: t.color, tone: s.tone }), PAD + 310, y + 45));
  text(PAD + 110, y + 84, "before", { anchor: "middle", size: 10, fill: onTile(heroGround) });
  text(PAD + 310, y + 84, "after", { anchor: "middle", size: 10, fill: onTile(heroGround) });
  y += 110;

  // 5. Pixel truth: rasterized at dpr 1 and dpr 2, then nearest-upscaled.
  caption(`pixel truth - the dot's ${DOT_BOX}px box at dpr 1 (x${ZOOM}) and dpr 2 (x${ZOOM / 2}), nearest: rest, then pressed at the pop's peak`);
  const tiles = [
    { label: "rest, dpr 1", svg: pointerRasterSvg({ color: t.color, tone: s.tone }) },
    { label: "pressed + peak, dpr 1", svg: pointerRasterSvg({ color: t.color, tone: s.tone, pressed: true, pop: POP.peak }) },
    { label: "rest, dpr 2", svg: pointerRasterSvg({ color: t.color, tone: s.tone, size: DOT_BOX * 2 }) },
  ];
  const TILE = DOT_BOX * ZOOM;
  for (const [i, tile] of tiles.entries()) {
    const x = PAD + i * (TILE + 40);
    // The ground goes INTO the raster, so the antialiased edge blends onto it.
    const withGround = tile.svg.replace(/(<svg[^>]*>)/, `$1<rect x="-100" y="-100" width="200" height="200" fill="${ground}"/>`);
    composites.push({ input: await pixelTile(withGround, TILE), left: x, top: y });
    text(x, y + TILE + 16, tile.label, { size: 10 });
  }
  y += TILE + 40;

  const H = y + PAD;
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${s.bg}"/>${rows.join("")}</svg>`;
  await sharp(Buffer.from(doc)).composite(composites).png().toFile(join(OUT, `_sheet-${s.id}.png`));
}
console.log(`Wrote ${SHEETS.length} review sheets -> exploration/pointer/_sheet-*.png`);
