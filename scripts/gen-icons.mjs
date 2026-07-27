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
//   grayscale - the same knockout geometry recolored, for surfaces the OS
//               tints itself (iOS tinted, the Android 13+ themed layer,
//               the notification icon). Color varies, geometry never does.
//
// This script also emits the non-icon mobile assets that share the same
// tree: the splash mark and the Play Store feature graphic (the one output
// under resources/ with NO alpha channel, because Play rejects it).
//
// Usage: npm run gen:icons   (or node scripts/gen-icons.mjs)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CREAM, PANEL, knockout, discOnSquare, f4kParts, f4kAlphaParts, f4kMonoSvg, cardKParts } from "./lib/mark.mjs";
import { featureGraphicSvg } from "./lib/feature-graphic.mjs";

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
// Android 13+ THEMED icon: one alpha-shaped layer the launcher tints from the
// wallpaper. Same 66% safe zone as the foreground, canonical F4k geometry, and
// the card knocked out as a fourth hole (a painted card would vanish once the
// whole layer is one color - the same reasoning as brandmark-mono.svg).
const F4K_ALPHA = f4kAlphaParts();
await writeFile(
  join(M, "android-adaptive-monochrome.png"),
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${AD}" height="${AD}">
    <g transform="translate(${off},${off})">${knockout(safe, F4K_ALPHA.holes, "", "#ffffff").replace(/<\/?svg[^>]*>/g, "")}</g>
  </svg>`)
);

// iOS 18+ ships three icon variants. The light master above is the opaque
// cream square; dark and tinted omit the background because the SYSTEM
// composites its own material behind them, so both are transparent artwork.
// Both keep the CANONICAL F4k geometry (not the mono-tuned pair, which is
// scoped to 20-24px themed chrome) so the three variants stay pixel-consistent
// as the user toggles home-screen appearance.
await writeFile(join(M, "ios-appstore-1024-dark.png"), await png(knockout(1024, F4K.holes, F4K.filled)));
// Tinted must be grayscale - iOS maps luminance onto the user's tint. Keeping
// the card as a BRIGHTER chip preserves the gesture the mono-vs-duotone review
// settled on (a flat single-tone glyph drifts toward a generic monogram). The
// two values are the brand pair converted to sRGB luma and normalised so the
// card lands at white: rust 113 / amber 172 -> ratio 0.658 -> disc 168.
const TINT_CARD = "#ffffff";
const TINT_DISC = "#a8a8a8";
const F4K_TINT = f4kParts(TINT_CARD);
await writeFile(join(M, "ios-appstore-1024-tinted.png"), await png(knockout(1024, F4K_TINT.holes, F4K_TINT.filled, TINT_DISC)));

// Android status-bar notification icon: the OS discards color and keeps only
// the alpha channel, so this is pure white on transparency. This is the ONE
// mobile surface that takes the mono-tuned geometry - it displays at 24dp,
// exactly the 20-24px band that tuning was selected for. Inset to Material's
// circular keyline (20 of 24dp) so it does not read oversized beside system
// icons. f4kMonoSvg returns a viewBox="0 0 100 100" document rather than
// pixel-absolute coordinates, so this scales as well as translates. The
// fractional scale is legitimate here: the integer-scale-only rule governs
// SPRITES (a pixel grid, which blurs when scaled fractionally). The mark is
// smooth vector geometry with no grid to preserve.
const NOTIF = 96;
const notifD = Math.round(NOTIF * (20 / 24));
const notifOff = (NOTIF - notifD) / 2;
await writeFile(
  join(M, "notification-icon.png"),
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${NOTIF}" height="${NOTIF}">
    <g transform="translate(${notifOff},${notifOff}) scale(${notifD / 100})">${f4kMonoSvg("#ffffff").replace(/<\/?svg[^>]*>/g, "")}</g>
  </svg>`)
);

// Splash mark. The splash DISPLAYS LARGE, so it takes card-K per the
// displayed-context rule. Shipping it explicitly closes a hidden coupling:
// the mobile splash used to point at resources/desktop/icon-512.png, so a
// future desktop retier would have silently changed the mobile splash.
await writeFile(join(M, "splash-1024.png"), pngs[1024]);

// Play Store feature graphic. REQUIRED to publish on every track beyond
// internal testing. Play rejects an alpha channel (JPEG or 24-bit PNG only),
// so this is the one output in resources/ that is FLATTENED to truecolour.
// The composition lives in lib/feature-graphic.mjs so the review sheet can
// render ground candidates from the same source.
await sharp(Buffer.from(featureGraphicSvg(PANEL)))
  .flatten({ background: PANEL })
  .png()
  .toFile(join(M, "android-feature-graphic-1024x500.png"));

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

**Vectors:** the canonical SVG marks live in \`../assets/\` (consumer-agnostic,
including the theme-tinted in-app pair: \`brandmark-mono-amber.svg\`, the
currentColor disc with the amber card kept, the default themed lockup, and
\`brandmark-mono.svg\`, pure currentColor for strict monochrome). The
\`web/brandmark*.svg\` files below are byte copies so the website deploys one
folder.

## desktop/ (kangentic, Electron)
| File | Use | Mark |
|------|-----|------|
| icon.ico | Windows app icon (taskbar, title bar, installer); 16-256 | tiered per entry |
| icon.icns | macOS dock / Finder; 16-1024 | tiered per entry |
| icon.png + icon-{16..1024}.png | Linux / BrowserWindow ladder | F4k <=64, card-K >=128 |

These rasters feed NATIVE OS surfaces that do not decode SVG: electron-builder
requires .ico/.icns/.png for the packaged app icon, and Electron's
\`nativeImage.createFromPath()\` (BrowserWindow icon, \`app.dock.setIcon\`,
\`Tray\`) decodes PNG/JPEG/ICO/ICNS only. The raster ladder is a requirement of
the native layer, not a missed optimization. In-app renderer surfaces consume
\`../assets/*.svg\` instead - \`brandmark-mono-amber.svg\` for themed lockups
(the disc tints, the amber card stays), \`brandmark-mono.svg\` for strict
monochrome, \`brandmark-small.svg\` where the fixed palette works. A future
macOS tray would take a template PNG derived from the pure mono, not an SVG.

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
| ios-appstore-1024-dark.png | \`ios.icon.dark\`; iOS 18+ dark home screen | F4k (transparent) |
| ios-appstore-1024-tinted.png | \`ios.icon.tinted\`; iOS 18+ tinted home screen | F4k (grayscale, transparent) |
| android-playstore-512.png | Play Store listing | F4k (opaque square) |
| android-adaptive-foreground.png (432) | adaptive icon foreground; mark in the 66% safe zone | F4k |
| android-adaptive-background.png (432) | adaptive icon background | solid cream |
| android-adaptive-monochrome.png (432) | \`adaptiveIcon.monochromeImage\`; Android 13+ themed icon | F4k (white, alpha-shaped) |
| notification-icon.png (96) | \`expo-notifications\` plugin icon; Android status bar | F4k mono-tuned (white on transparent) |
| splash-1024.png | splash mark (displays large) | card-K |
| android-feature-graphic-1024x500.png | Play Store listing; REQUIRED beyond internal testing | wordmark + Overseer |

The iOS dark and tinted variants carry NO background: iOS composites its own
material behind them and applies the user's tint, so baking one in would
double it. Tinted is grayscale because iOS maps luminance onto the tint.

The feature graphic is the ONE file here with no alpha channel (Play rejects
transparency and crops the edges in some placements), which is why it uses the
panel tint rather than near-white cream and keeps all content inset.
`);

console.log(`Wrote production resources to ${RES}: desktop/, web/, mobile/`);
console.log(`Wrote the tier-boundary preview to exploration/icon-concepts/preview.png`);
