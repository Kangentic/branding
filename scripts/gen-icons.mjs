// gen-icons.mjs - builds resources/, the production icon tree for the
// CURRENT selected mark: every variant/size/type the website, desktop app
// (Electron), and mobile app (Android/iOS) need. Consumers copy from
// resources/<surface>/ and never generate icons themselves.
//
// TWO-TIER APP ICON, keyed to DISPLAYED context (not raster resolution).
// The dividing line is whether the OS lets you supply a size-specific
// entry or forces one master it downscales itself:
//   - Multi-resolution containers (.ico/.icns) and the desktop PNG ladder
//     tier per entry: card-K at 128+ (dock, Finder/Explorer large views
//     pull these), F4k at 16-64 (taskbar/tray/tab pull these). This is
//     what these formats are for.
//   - Single-image masters the OS shrinks to chrome - iOS/Play store
//     icons (which become the small home-screen icon), PWA/apple-touch/
//     manifest icons, favicons - stay F4k. A card-K master downscaled to
//     a 60px home-screen icon would be an illegible mini-K.
//   - web/logo.png is the brand logo (search/JSON-LD, shown large) = card-K.
//
// Renditions:
//   knockout  - true alpha holes; theme/wallpaper flows through (the v1
//               blue K behaved the same way). Used everywhere alpha is
//               allowed.
//   on-square - opaque full-bleed square (iOS/store surfaces reject
//               alpha); holes reveal the cream square instead.
//
// Usage: npm run gen:icons   (or node scripts/gen-icons.mjs)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CREAM, knockout, discOnSquare, f4kParts, cardKParts } from "./lib/mark.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RES = join(ROOT, "resources");
const ASSETS = join(ROOT, "assets");
// The tier-boundary preview is a review artifact, not a shipped resource: it
// carries text labels and lives under exploration/ (outside the determinism
// gate, which only covers assets/ and resources/).
const EXPLORE = join(ROOT, "exploration", "icon-concepts");

const F4K = f4kParts();
// Container / ladder entries tier by the size they display at; masters the
// OS downscales to chrome (every squarePng surface) stay F4k.
const markFor = (size) => (size >= 128 ? cardKParts(size) : F4K);
const png = async (svg) => sharp(Buffer.from(svg)).png().toBuffer();
const discPng = (size) => {
  const m = markFor(size);
  return png(knockout(size, m.holes, m.filled));
};
const squarePng = (size, discFrac = 0.82) =>
  png(discOnSquare(size, discFrac, CREAM, F4K));

// --- Containers (hand-rolled: PNG-payload ICO is Vista+, ICNS icp4..ic10) --
function buildIco(pngs, sizes) {
  const entries = sizes.map((s) => pngs[s]);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = [];
  for (let i = 0; i < entries.length; i++) {
    const s = sizes[i];
    const d = Buffer.alloc(16);
    d.writeUInt8(s >= 256 ? 0 : s, 0);
    d.writeUInt8(s >= 256 ? 0 : s, 1);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(entries[i].length, 8);
    d.writeUInt32LE(offset, 12);
    offset += entries[i].length;
    dirs.push(d);
  }
  return Buffer.concat([header, ...dirs, ...entries]);
}

const ICNS_TYPES = { icp4: 16, icp5: 32, icp6: 64, ic07: 128, ic08: 256, ic09: 512, ic10: 1024 };
function buildIcns(pngs) {
  const chunks = [];
  for (const [type, size] of Object.entries(ICNS_TYPES)) {
    const data = pngs[size];
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(data.length + 8, 4);
    chunks.push(Buffer.concat([head, data]));
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

// --- The knockout ladder (shared by desktop + web favicons) ----------------
const LADDER = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const pngs = {};
for (const s of LADDER) pngs[s] = await discPng(s);

// --- desktop/ (Electron) ----------------------------------------------------
const D = join(RES, "desktop");
await mkdir(D, { recursive: true });
for (const s of LADDER) await writeFile(join(D, `icon-${s}.png`), pngs[s]);
await writeFile(join(D, "icon.png"), pngs[512]);
await writeFile(join(D, "icon.ico"), buildIco(pngs, [16, 24, 32, 48, 64, 128, 256]));
await writeFile(join(D, "icon.icns"), buildIcns(pngs));

// --- web/ (kangentic.com) ---------------------------------------------------
const W = join(RES, "web");
await mkdir(W, { recursive: true });
await writeFile(join(W, "favicon.ico"), buildIco(pngs, [16, 32, 48]));
await writeFile(join(W, "favicon-16x16.png"), pngs[16]);
await writeFile(join(W, "favicon-32x32.png"), pngs[32]);
await writeFile(join(W, "apple-touch-icon.png"), await squarePng(180));
await writeFile(join(W, "icon-192.png"), await squarePng(192));
await writeFile(join(W, "icon-512.png"), await squarePng(512));
await writeFile(join(W, "logo.png"), pngs[512]); // JSON-LD publisher logo
// The SVG marks web pages embed directly (nav, docs header, hero-scale).
const { copyFile } = await import("node:fs/promises");
await copyFile(join(ASSETS, "brandmark.svg"), join(W, "brandmark.svg"));
await copyFile(join(ASSETS, "brandmark-small.svg"), join(W, "brandmark-small.svg"));

// --- mobile/ (kangentic-mobile, Expo) ----------------------------------------
const M = join(RES, "mobile");
await mkdir(M, { recursive: true });
// iOS: opaque unrounded square, alpha rejected; the OS masks corners itself.
await writeFile(join(M, "ios-appstore-1024.png"), await squarePng(1024));
await writeFile(join(M, "android-playstore-512.png"), await squarePng(512));
// Adaptive foreground: the mark must sit inside the center 66% safe zone of
// the 432px canvas (the OS masks and zooms the layer).
const AD = 432;
const safe = Math.round(AD * 0.62);
const off = (AD - safe) / 2;
await writeFile(
  join(M, "android-adaptive-foreground.png"),
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${AD}" height="${AD}">
    <g transform="translate(${off},${off})">${knockout(safe, F4K.holes, F4K.filled).replace(/<\/?svg[^>]*>/g, "")}</g>
  </svg>`)
);
await writeFile(
  join(M, "android-adaptive-background.png"),
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${AD}" height="${AD}"><rect width="${AD}" height="${AD}" fill="${CREAM}"/></svg>`)
);

// --- Preview sheet: the desktop ladder on light and dark bars (shows the
// tier boundary: card-K at 128+, F4k at 64 and below) ------------------------
const sizes = [1024, 256, 128, 64, 48, 32, 24, 16];
const ROW_H = 340;
const bgs = [
  { fill: "#f6f1e8", label: "#6e6659" },
  { fill: "#1d1915", label: "#8a8378" },
];
const rows = bgs.map((bg, r) => {
  let px = 40;
  const cells = sizes.map((s) => {
    const shown = Math.min(s, 256);
    const cell = `<image x="${px}" y="${r * ROW_H + 40 + (256 - shown)}" width="${shown}" height="${shown}" href="data:image/png;base64,${pngs[s].toString("base64")}"/>
      <text x="${px + shown / 2}" y="${r * ROW_H + 330}" text-anchor="middle" font-family="monospace" font-size="16" fill="${bg.label}">${s}</text>`;
    px += shown + 40;
    return cell;
  });
  return { rect: `<rect x="0" y="${r * ROW_H}" width="${px}" height="${ROW_H}" fill="${bg.fill}"/>`, cells, width: px };
});
const width = Math.max(...rows.map((r) => r.width));
await mkdir(EXPLORE, { recursive: true });
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ROW_H * bgs.length}">
  ${rows.map((r) => r.rect).join("\n")}
  ${rows.flatMap((r) => r.cells).join("\n")}
</svg>`)).png().toFile(join(EXPLORE, "preview.png"));

// --- README ------------------------------------------------------------------
await writeFile(join(RES, "README.md"), `# Kangentic brand resources (v2, Warm Craft)

TWO-TIER APP ICON, keyed to displayed context (not raster resolution):
**card-K** (the letter, with the amber tip) where the mark shows large,
**F4k** (the board glyph) where the OS shows it small. The dividing line
is whether the OS picks a size-specific entry or downscales one master:

- Multi-resolution containers (.ico/.icns) and the desktop PNG ladder
  tier per entry - card-K at 128+, F4k at 16-64.
- Single-image masters the OS shrinks to chrome (store icons, PWA/
  apple-touch/manifest icons, favicons) stay F4k, so the small installed
  icon never becomes an illegible downscaled card-K.

Generated by \`npm run gen:icons\` - regenerate, never hand-edit. Knockout
renditions carry true alpha holes (the theme or wallpaper shows through,
like the v1 blue K did). The desktop tier boundary is previewed in the
branding repo at \`exploration/icon-concepts/preview.png\` (a review artifact,
not shipped here).

## desktop/ (kangentic, Electron)
| File | Use | Mark |
|------|-----|------|
| icon.ico | Windows app icon (taskbar, title bar, installer); 16-256 | tiered per entry |
| icon.icns | macOS dock / Finder; 16-1024 | tiered per entry |
| icon.png + icon-{16..1024}.png | Linux / BrowserWindow ladder | F4k <=64, card-K >=128 |

## web/ (kangentic.com)
| File | Use | Mark |
|------|-----|------|
| favicon.ico, favicon-16x16.png, favicon-32x32.png | browser tabs | F4k |
| apple-touch-icon.png (180) | iOS home-screen bookmark | F4k (opaque square) |
| icon-192.png, icon-512.png | site.webmanifest | F4k (opaque square) |
| logo.png (512) | JSON-LD publisher logo (shown large in search) | card-K |
| brandmark-small.svg | in-page mark at nav/header sizes | F4k |
| brandmark.svg | in-page mark at hero/social scale | card-K |

## mobile/ (kangentic-mobile, Expo)
| File | Use | Mark |
|------|-----|------|
| ios-appstore-1024.png | App Store master (downscales to the home-screen icon) | F4k (opaque, unrounded) |
| android-playstore-512.png | Play Store listing | F4k (opaque square) |
| android-adaptive-foreground.png (432) | adaptive icon foreground; mark in the 66% safe zone | F4k |
| android-adaptive-background.png (432) | adaptive icon background | solid cream |
`);

console.log(`Wrote production resources to ${RES}: desktop/, web/, mobile/`);
console.log(`Wrote the tier-boundary preview to exploration/icon-concepts/preview.png`);
