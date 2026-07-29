// gen-ui.mjs - the ui glyph set: the navigation marks the desktop app, the
// mobile app and the website all render.
//
// Writes:
//   assets/ui/*.svg              the currentColor masters (web, desktop, chrome)
//   assets/ui/ui.json            the framework-agnostic manifest
//   resources/mobile/*-tab-*.png the iOS tab-bar rasters (1x/2x/3x)
//   exploration/ui/_sheet-*.png  the review sheets (NOT shipped)
//
// All geometry comes from lib/ui-glyphs.mjs. This file declares none.
//
// Usage: npm run gen:ui   (or node scripts/gen-ui.mjs)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CREAM, INK, INK_SOFT, PANEL, f4kMonoSvg } from "./lib/mark.mjs";
import { STROKE, VIEW, markSvg, shippedSet } from "./lib/activity.mjs";
import {
  FRAME_R_ALTERNATES,
  GLYPHS,
  TAB_SCALES,
  TAB_SIZES,
  fileFor,
  glyphRasterSvg,
  glyphSvg,
  kanbanBodyWithFrameR,
  manifest,
  rasterFileFor,
} from "./lib/ui-glyphs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIP = join(ROOT, "assets", "ui");
const MOB = join(ROOT, "resources", "mobile");
const OUT = join(ROOT, "exploration", "ui");

const png = async (svg) => sharp(Buffer.from(svg)).png().toBuffer();
const stripInner = (s) => s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

// ---------------------------------------------------------------------------
// The shipped vectors.
// ---------------------------------------------------------------------------

await mkdir(SHIP, { recursive: true });
for (const g of GLYPHS) {
  // Emitted at the natural 24. width/height are presentation attributes, so CSS
  // or an SvgXml prop overrides them on any surface that needs another size.
  await writeFile(join(SHIP, fileFor(g)), glyphSvg(g) + "\n");
}
await writeFile(join(SHIP, "ui.json"), JSON.stringify(manifest(), null, 2) + "\n");
console.log(`Wrote ${GLYPHS.length} glyph(s) + ui.json -> assets/ui/`);

// ---------------------------------------------------------------------------
// The iOS tab rasters.
//
// A tab icon is a TEMPLATE image: UIKit throws away every color channel and
// renders the ALPHA channel in the bar's tint. So the payload is alpha, and any
// opaque background survives as a tinted block filling the whole tab slot.
// That failure is invisible in this repo and only shows up in a store
// screenshot, so it is asserted here rather than trusted.
// ---------------------------------------------------------------------------

/**
 * Assert a buffer is a correct template image.
 *
 * Checks alpha, and checks RGB only for pixels that are essentially fully
 * covered. Antialiased edge pixels legitimately carry partial coverage, and
 * librsvg leaves RGB at 0 on fully transparent pixels, so asserting "every
 * pixel is white" would fail a perfectly good render.
 */
async function assertTemplateImage(buf, size, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fail = (msg) => {
    throw new Error(`${label}: ${msg} (an iOS tab icon must be alpha-only white on transparency)`);
  };
  if (info.width !== size || info.height !== size) fail(`is ${info.width}x${info.height}, expected ${size}x${size}`);
  if (info.channels !== 4) fail(`has ${info.channels} channels, expected RGBA`);

  const at = (x, y) => {
    const i = (y * info.width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };
  const last = size - 1;
  for (const [x, y] of [[0, 0], [last, 0], [0, last], [last, last]]) {
    if (at(x, y).a !== 0) fail(`corner ${x},${y} has alpha ${at(x, y).a}, expected 0`);
  }

  let inked = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    inked++;
    if (a < 251) continue; // antialiased edge: coverage is the point, color is not
    opaque++;
    if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
      fail(`an opaque pixel is rgb(${data[i]},${data[i + 1]},${data[i + 2]}), expected pure white`);
    }
  }
  if (!inked) fail("is entirely transparent");
  if (inked === size * size) fail("has no transparent pixels at all, so it would tint as a solid block");
  if (!opaque) fail("has no fully covered pixel, so the stroke never resolves");
  return { inked, opaque };
}

await mkdir(MOB, { recursive: true });
for (const g of GLYPHS) {
  for (const [i, size] of TAB_SIZES.entries()) {
    const buf = await png(glyphRasterSvg(g, { size, color: "#ffffff" }));
    const name = rasterFileFor(g, size);
    await assertTemplateImage(buf, size, name);
    await writeFile(join(MOB, name), buf);
    console.log(`  ${name}  ${TAB_SCALES[i]}x  alpha-only OK`);
  }
}
console.log(`Wrote ${GLYPHS.length * TAB_SIZES.length} tab raster(s) -> resources/mobile/`);

// ---------------------------------------------------------------------------
// Review sheets. Artifacts under exploration/, so NOT held to byte determinism.
//
// Per the icon-drafting review discipline: judge at 16-32 first, prove the
// pixels with a nearest-neighbour zoom, and render in the surface that actually
// consumes the mark. The adjacency band is the one that matters most here: the
// F4k brandmark is ITSELF a board glyph (three column holes), so the real risk
// is a nav icon that reads as the app icon sitting two rows away from it.
// ---------------------------------------------------------------------------

await mkdir(OUT, { recursive: true });

const STRIP_SIZES = [16, 20, 24, 26, 32, 48];
const GROUNDS = [
  { id: "light", bg: CREAM, panel: PANEL, fg: INK, soft: INK_SOFT, bar: "#efeae1", active: "#c0562f", idle: "#8a8378" },
  { id: "dark", bg: "#1d1915", panel: "#272220", fg: "#f2ede4", soft: "#8a8378", bar: "#141110", active: "#e8a33d", idle: "#7d766c" },
];

const W = 900;
const PAD = 24;
const LABEL = 190;

const glyphAt = (body, x, y, size, color) =>
  `<g transform="translate(${x},${y}) scale(${size / VIEW})" fill="none" stroke="${color}"
     stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

// The activity sibling, to prove the two sets share one baseline in a row.
const terminalIdle = shippedSet().marks.find((m) => m.id === "terminal-idle");

for (const g of GROUNDS) {
  const rows = [];
  let y = PAD;

  const caption = (text) => {
    rows.push(`<text x="${PAD}" y="${y}" font-family="monospace" font-size="12" fill="${g.soft}">${text}</text>`);
    y += 14;
  };

  // 1. Size strips, one row per candidate radius.
  caption("size strip - judge at 16-32 first; the glyph must be unmistakable at 24");
  rows.push(
    ...STRIP_SIZES.map(
      (s, i) => `<text x="${LABEL + i * 90 + 24}" y="${y + 10}" text-anchor="middle" font-family="monospace" font-size="10" fill="${g.soft}">${s}</text>`,
    ),
  );
  y += 18;
  for (const alt of FRAME_R_ALTERNATES) {
    const body = kanbanBodyWithFrameR(alt.r);
    rows.push(`<text x="${PAD}" y="${y + 28}" font-family="monospace" font-size="11" fill="${g.fg}">rx=${alt.r}</text>`);
    rows.push(`<text x="${PAD}" y="${y + 42}" font-family="monospace" font-size="9" fill="${g.soft}">${alt.note}</text>`);
    STRIP_SIZES.forEach((s, i) => {
      rows.push(glyphAt(body, LABEL + i * 90 + 24 - s / 2, y + 24 - s / 2, s, g.fg));
    });
    y += 56;
  }
  y += 10;

  // 2. Adjacency: the new nav glyph beside the brandmark it must NOT resemble,
  //    and beside an activity mark it must share a baseline with, all at 24.
  caption("adjacency at 24 - kanban must not read as the F4k brandmark, and must sit level with the activity set");
  y += 6;
  const adj = [
    { label: "kanban (new)", el: glyphAt(kanbanBodyWithFrameR(FRAME_R_ALTERNATES[0].r), 0, 0, 24, g.fg) },
    { label: "F4k brandmark", el: `<g transform="scale(0.24)">${stripInner(f4kMonoSvg(g.fg))}</g>` },
    { label: "terminal-idle", el: glyphAt(stripInner(markSvg(terminalIdle, { size: VIEW, resting: true })), 0, 0, 24, g.fg) },
  ];
  adj.forEach((a, i) => {
    const x = PAD + i * 220;
    rows.push(`<rect x="${x - 8}" y="${y - 8}" width="40" height="40" rx="8" fill="${g.panel}"/>`);
    rows.push(`<g transform="translate(${x},${y})">${a.el}</g>`);
    rows.push(`<text x="${x + 44}" y="${y + 18}" font-family="monospace" font-size="11" fill="${g.fg}">${a.label}</text>`);
  });
  y += 56;

  // 3. The real surface: an iOS tab bar at true 25px, active and inactive.
  caption("ios tab bar - the shipped 25px raster at true size, tinted active and inactive");
  y += 6;
  rows.push(`<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="56" fill="${g.bar}"/>`);
  const tabs = [
    { label: "Board", tint: g.active },
    { label: "Board", tint: g.idle },
  ];
  tabs.forEach((t, i) => {
    const x = PAD + 60 + i * 200;
    rows.push(glyphAt(kanbanBodyWithFrameR(FRAME_R_ALTERNATES[0].r), x, y + 8, 25, t.tint));
    rows.push(`<text x="${x + 12}" y="${y + 46}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${t.tint}">${t.label}</text>`);
  });
  rows.push(`<text x="${PAD + 460}" y="${y + 32}" font-family="monospace" font-size="11" fill="${g.soft}">25pt, the metric the stroke was chosen for</text>`);
  y += 76;

  // 4. Pixel truth: the shipped 1x raster, nearest-upscaled.
  caption("pixel truth - the shipped 25px raster at x8 (nearest), tinted as the OS would");
  y += 6;
  const zoomSrc = await png(glyphRasterSvg(GLYPHS[0], { size: TAB_SIZES[0], color: g.fg }));
  const zoom = await sharp(zoomSrc).resize(TAB_SIZES[0] * 8, TAB_SIZES[0] * 8, { kernel: "nearest" }).png().toBuffer();
  rows.push(`<rect x="${PAD}" y="${y}" width="200" height="200" fill="${g.panel}"/>`);
  rows.push(`<image x="${PAD}" y="${y}" width="200" height="200" href="data:image/png;base64,${zoom.toString("base64")}"/>`);
  rows.push(`<text x="${PAD + 220}" y="${y + 100}" font-family="monospace" font-size="11" fill="${g.soft}">stroke 2 at 25/24 scale is almost entirely antialiased</text>`);
  y += 220;

  const H = y + PAD;
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${g.bg}"/>${rows.join("")}</svg>`;
  await sharp(Buffer.from(doc)).png().toFile(join(OUT, `_sheet-${g.id}.png`));
}
console.log(`Wrote ${GROUNDS.length} review sheets -> exploration/ui/_sheet-*.png`);
