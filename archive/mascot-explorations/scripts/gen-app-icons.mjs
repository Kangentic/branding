// gen-app-icons.mjs - build-time dev tool. Generates the rebranded Kangentic
// APP icon sets from the amber Overseer mascot, in two treatments:
//   border/    - mascot on a Warm Craft tile (cream card, rust keyline,
//                rounded corners; corners anti-aliased, sprite crisp)
//   no-border/ - mascot silhouette on transparency (taskbar-style, like
//                Discord/Spotify/VS Code marks)
// Each set: PNGs 16..1024, icon.png, multi-size icon.ico, macOS icon.icns,
// favicons, and a _preview.png sheet (the no-border preview shows every size
// on both a dark and a light bar, since taskbars come in both).
// Small sizes swap to an armless reduction so the mark stays legible; every
// size renders the sprite at an integer pixel multiple.
//
// Usage: node scripts/gen-app-icons.mjs [outDir]
// Default outDir: C:/Users/tyler/Documents/GitHub/kangentic/resources/rebrand
// (a NEW folder - the app's live resources are never overwritten)

import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(
  process.argv[2] ?? "C:/Users/tyler/Documents/GitHub/kangentic/resources/rebrand"
);

const CREAM = "#fdfbf7";
const INK = "#24201b";
const RUST = "#c0562f";
const AMBER = "#e8a33d";
const PALETTE = { a: AMBER, k: INK, c: CREAM, r: RUST, ".": null };

// Canonical mascot (matches gen-sprites.mjs overseerAmber), 18x12.
const arms = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

// Armless reduction for tiny sizes (14x11).
const small = `
...aaaaaaaa...
.aaaaaaaaaaaa.
aaaaaaaaaaaaaa
aakcaakcaakcaa
aakkaakkaakkaa
aaaaaaaaaaaaaa
aaaaaaaaaaaaaa
aaaaaaaaaaaaaa
.aaaaaaaaaaaa.
..aa..aa..aa..
..aa..aa..aa..
`;

const parse = (m) => m.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));

function rects(map, unit, ox, oy) {
  const grid = parse(map);
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const out = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = grid[y][x] ?? ".";
      const color = PALETTE[ch] ?? null;
      if (color === null) { x++; continue; }
      let run = 1;
      while (x + run < w && (grid[y][x + run] ?? ".") === ch) run++;
      out.push(`<rect x="${ox + x * unit}" y="${oy + y * unit}" width="${run * unit}" height="${unit}" fill="${color}"/>`);
      x += run;
    }
  }
  return { svg: out.join(""), w, h };
}

const gridSize = (map) => {
  const grid = parse(map);
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
};

function spriteGroup(size, map, scale) {
  const { w, h } = gridSize(map);
  const ox = Math.round((size - w * scale) / 2);
  const oy = Math.round((size - h * scale) / 2);
  const { svg } = rects(map, scale, ox, oy);
  return `<g shape-rendering="crispEdges">${svg}</g>`;
}

// Tiled: cream card + rust keyline (anti-aliased), sprite crisp on top.
function tileSvg(size, map, scale) {
  const radius = Math.max(2, Math.round(size * 0.18));
  const border = Math.max(1, Math.round(size / 56));
  const inset = border / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="${CREAM}"/>
    <rect x="${inset}" y="${inset}" width="${size - border}" height="${size - border}" rx="${radius - inset}" fill="none" stroke="${RUST}" stroke-width="${border}"/>
    ${spriteGroup(size, map, scale)}
  </svg>`;
}

// Tile without the keyline: clean cream card, sprite crisp on top.
function tilePlainSvg(size, map, scale) {
  const radius = Math.max(2, Math.round(size * 0.18));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="${CREAM}"/>
    ${spriteGroup(size, map, scale)}
  </svg>`;
}

// Transparent: sprite alone on alpha (taskbar-logo style).
function bareSvg(size, map, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${spriteGroup(size, map, scale)}</svg>`;
}

// size -> [map, sprite scale]; the tiled set leaves breathing room for the
// keyline, the bare set maximizes fill (taskbar legibility).
const PLAN_TILED = {
  16: [small, 1], 24: [small, 1], 32: [small, 2], 48: [arms, 2],
  64: [arms, 3], 128: [arms, 6], 256: [arms, 12], 512: [arms, 24], 1024: [arms, 48],
};
const PLAN_BARE = {
  16: [small, 1], 24: [arms, 1], 32: [small, 2], 48: [arms, 2],
  64: [arms, 3], 128: [arms, 7], 256: [arms, 14], 512: [arms, 28], 1024: [arms, 56],
};

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

// Full-bleed opaque square (iOS/Android store surfaces: the OS applies its
// own corner mask, so squares must be unrounded and alpha-free).
function squareSvg(size, map, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" fill="${CREAM}"/>
    ${spriteGroup(size, map, scale)}
  </svg>`;
}

async function genSet(dir, plan, makeSvg, previewBgs) {
  await mkdir(dir, { recursive: true });
  const pngs = {};
  for (const [size, [map, scale]] of Object.entries(plan)) {
    const buf = await sharp(Buffer.from(makeSvg(Number(size), map, scale))).png().toBuffer();
    pngs[size] = buf;
    await writeFile(join(dir, `icon-${size}.png`), buf);
  }
  await writeFile(join(dir, "icon.png"), pngs[512]);
  await writeFile(join(dir, "favicon-16x16.png"), pngs[16]);
  await writeFile(join(dir, "favicon-32x32.png"), pngs[32]);
  await writeFile(join(dir, "icon.ico"), buildIco(pngs, [16, 24, 32, 48, 64, 128, 256]));
  await writeFile(join(dir, "favicon.ico"), buildIco(pngs, [16, 32, 48]));
  await writeFile(join(dir, "icon.icns"), buildIcns(pngs));

  // Preview: one labeled row of sizes per background.
  const sizes = [1024, 256, 128, 64, 48, 32, 24, 16];
  const ROW_H = 340;
  const rows = previewBgs.map((bg, r) => {
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
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ROW_H * previewBgs.length}">
    ${rows.map((r) => r.rect).join("\n")}
    ${rows.flatMap((r) => r.cells).join("\n")}
  </svg>`;
  await sharp(Buffer.from(sheet)).png().toFile(join(dir, "_preview.png"));
  return pngs;
}

// Clear earlier flat output so the folder is cleanly organized in two sets.
for (const f of [
  "icon-16.png", "icon-24.png", "icon-32.png", "icon-48.png", "icon-64.png",
  "icon-128.png", "icon-256.png", "icon-512.png", "icon-1024.png", "icon.png",
  "icon.ico", "icon.icns", "favicon-16x16.png", "favicon-32x32.png",
  "favicon.ico", "_preview.png",
]) {
  await rm(join(OUT, f), { force: true });
}

const borderPngs = await genSet(join(OUT, "border"), PLAN_TILED, tileSvg, [
  { fill: "#f6f1e8", label: "#6e6659" },
]);
await genSet(join(OUT, "no-border"), PLAN_TILED, tilePlainSvg, [
  { fill: "#f6f1e8", label: "#6e6659" },
  { fill: "#1d1915", label: "#8a8378" },
]);
const barePngs = await genSet(join(OUT, "transparent"), PLAN_BARE, bareSvg, [
  { fill: "#1d1915", label: "#8a8378" },
  { fill: "#eceae6", label: "#6e6659" },
]);

// --- production/: the curated per-surface set --------------------------------
// desktop: transparent mark for Windows taskbar + Linux/window icons (logo-
//          on-alpha, like every app in the taskbar); bordered tile for the
//          macOS dock (dock icons are plates).
// web:     bordered tile for favicons (holds its own on any tab color);
//          full-bleed squares for apple-touch-icon and the PWA manifest.
// mobile:  full-bleed opaque squares for iOS (the OS rounds corners itself;
//          alpha is rejected) and Play Store; Android adaptive layers with
//          the mark inside the 66% safe zone.
const P = join(OUT, "production");
await mkdir(join(P, "desktop"), { recursive: true });
await mkdir(join(P, "web"), { recursive: true });
await mkdir(join(P, "mobile"), { recursive: true });

// desktop
for (const s of [16, 24, 32, 48, 64, 128, 256, 512, 1024]) {
  await writeFile(join(P, "desktop", `icon-${s}.png`), barePngs[s]);
}
await writeFile(join(P, "desktop", "icon.png"), barePngs[512]);
await writeFile(join(P, "desktop", "icon.ico"), buildIco(barePngs, [16, 24, 32, 48, 64, 128, 256]));
await writeFile(join(P, "desktop", "icon.icns"), buildIcns(borderPngs));

// web
await writeFile(join(P, "web", "favicon.ico"), buildIco(borderPngs, [16, 32, 48]));
await writeFile(join(P, "web", "favicon-16x16.png"), borderPngs[16]);
await writeFile(join(P, "web", "favicon-32x32.png"), borderPngs[32]);
const webSquares = [
  ["apple-touch-icon.png", 180, arms, 8],
  ["icon-192.png", 192, arms, 8],
  ["icon-512.png", 512, arms, 24],
];
for (const [name, size, map, scale] of webSquares) {
  await writeFile(join(P, "web", name), await sharp(Buffer.from(squareSvg(size, map, scale))).png().toBuffer());
}

// mobile
await writeFile(join(P, "mobile", "ios-appstore-1024.png"),
  await sharp(Buffer.from(squareSvg(1024, arms, 44))).png().toBuffer());
await writeFile(join(P, "mobile", "android-playstore-512.png"),
  await sharp(Buffer.from(squareSvg(512, arms, 22))).png().toBuffer());
// Adaptive foreground: mark must sit inside the center 66% safe zone of the
// 108dp (432px) canvas -> max 264px; arms at 14x = 252x168.
await writeFile(join(P, "mobile", "android-adaptive-foreground.png"),
  await sharp(Buffer.from(bareSvg(432, arms, 14))).png().toBuffer());
await writeFile(join(P, "mobile", "android-adaptive-background.png"),
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect width="432" height="432" fill="${CREAM}"/></svg>`)).png().toBuffer());

const readme = `# Kangentic rebrand icon set (production)

The amber Overseer mascot, cut per surface. Generated by
kangentic.com/scripts/gen-app-icons.mjs - regenerate there, do not hand-edit.
Exploration sets live in ../border, ../no-border, ../transparent.

## desktop/ (Electron)
| File | Use | Treatment |
|------|-----|-----------|
| icon.ico | Windows app icon (taskbar, title bar, installer) | transparent mark (16-256) |
| icon.icns | macOS dock | bordered cream tile (dock icons are plates) |
| icon.png + icon-{16..1024}.png | Linux / BrowserWindow icon ladder | transparent mark |

## web/ (kangentic.com)
| File | Use | Treatment |
|------|-----|-----------|
| favicon.ico, favicon-16x16.png, favicon-32x32.png | browser tabs | bordered cream tile (holds on any tab color) |
| apple-touch-icon.png (180) | iOS home-screen bookmark | full-bleed cream square (iOS rounds it) |
| icon-192.png, icon-512.png | site.webmanifest | full-bleed cream square |

## mobile/ (kangentic-mobile)
| File | Use | Treatment |
|------|-----|-----------|
| ios-appstore-1024.png | App Store + asset catalog master | opaque unrounded square (iOS masks corners; alpha is rejected) |
| android-playstore-512.png | Play Store listing | opaque square |
| android-adaptive-foreground.png (432) | adaptive icon foreground layer | transparent, mark inside the 66% safe zone |
| android-adaptive-background.png (432) | adaptive icon background layer | solid cream |

Every asset renders the sprite at an exact integer pixel multiple; tiles
anti-alias their rounded corners while the sprite stays crispEdges.
`;
await writeFile(join(P, "README.md"), readme);

console.log(`Wrote rebranded app icon sets to ${OUT}: border, no-border, transparent, production`);
