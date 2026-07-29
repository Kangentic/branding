// gen-review.mjs - renders the in-situ header mocks the icon-drafting review
// discipline calls for (site header light + docs dark + browser tabs) but that
// the other generators do not emit. Contact-sheet size strips already come from
// `npm run gen` (exploration/icon-concepts/_sheet*.png, _small-rescue.png) and
// the mascot from `npm run gen:sprites`; this fills the one gap: the mark seen
// at nav / tab size in a real surface, on both themes.
//
// Imports the canonical marks from lib/mark.mjs - NO geometry is re-declared
// here (mark-geometry-single-source). Output is a review artifact under
// exploration/, not a shipped asset, so it is exempt from the determinism gate.
// Usage: npm run gen:review

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CREAM, PANEL, INK, INK_SOFT, RUST, knockout, f4kParts, f4kAlphaParts, f4kMonoSvg, f4kDuoSvg, cardKParts } from "./lib/mark.mjs";
import { featureGraphicSvg } from "./lib/feature-graphic.mjs";
// The ui set, so the Board tab icon is reviewed in the surface it ships to.
// Filenames come from the lib rather than being retyped here.
import { GLYPHS as UI_GLYPHS, TAB_SIZES as UI_TAB_SIZES, rasterFileFor as uiRasterFileFor } from "./lib/ui-glyphs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "exploration", "review");
await mkdir(OUT, { recursive: true });

// Mock chrome colors only - browser/OS surfaces this sheet imitates, not brand
// tokens. The Warm Craft tokens themselves come from lib/mark.mjs.
const HAIRLINE = "#ece7dd";
const TERMINAL = "#1d1915";
const TERM_TEXT = "#f3ede3";
const TERM_SOFT = "#8a8378";
const TAB_BAR = "#dee1e6";
const TAB_ACTIVE = "#f6f1e8";

const F4K = f4kParts();
const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();
// Knockout marks carry true alpha holes, so composited over a header they let
// the theme ground show through - exactly the in-situ behavior to review.
const f4k = async (size) => (await png(knockout(size, F4K.holes, F4K.filled))).toString("base64");
const cardK = async (size) => {
  const m = cardKParts(size);
  return (await png(knockout(size, m.holes, m.filled))).toString("base64");
};

const nav = await f4k(40);
const hero = await cardK(72);
const fav16 = await f4k(16);
const fav32 = await f4k(32);

const img = (b64, x, y, s) =>
  `<image x="${x}" y="${y}" width="${s}" height="${s}" href="data:image/png;base64,${b64}"/>`;

const W = 1120;
const PAD = 40;

// A sheet is a stack of captioned bands. Each band is a monospace caption
// strip followed by the mock content, laid out top-down.
function newSheet() {
  const parts = [];
  let y = 0;
  const band = (caption, height, content) => {
    parts.push(`<text x="${PAD}" y="${y + 20}" font-family="monospace" font-size="13" fill="#9a8f7d">${caption}</text>`);
    const top = y + 32;
    parts.push(`<g transform="translate(0,${top})">${content(top)}</g>`);
    y = top + height + 28;
  };
  const render = async (file) => {
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}">
      <rect width="${W}" height="${y}" fill="#ffffff"/>
      ${parts.join("\n")}
    </svg>`)).png().toFile(join(OUT, file));
    console.log(`Wrote ${join(OUT, file)}`);
  };
  return { band, render };
}

const { band, render } = newSheet();

// 1. Light site header - the F4k mark at nav size, wordmark, nav links, and the
//    card-K at hero scale on the right.
band("light site header - F4k at nav, card-K at hero", 96, () => `
  <rect width="${W}" height="96" fill="${CREAM}"/>
  <rect y="95" width="${W}" height="1" fill="${HAIRLINE}"/>
  ${img(nav, PAD, 28, 40)}
  <text x="${PAD + 56}" y="60" font-family="sans-serif" font-weight="700" font-size="26" fill="${INK}">Kangentic</text>
  <text x="${W - 300}" y="58" font-family="monospace" font-size="15" fill="${INK_SOFT}">Docs   Changelog   GitHub</text>
  ${img(hero, W - 108, 12, 72)}
`);

// 2. Dark docs header - the same nav mark on the warm-black docs ("night") theme.
band("dark docs header - F4k at nav on warm black", 96, () => `
  <rect width="${W}" height="96" fill="${TERMINAL}"/>
  ${img(nav, PAD, 28, 40)}
  <text x="${PAD + 56}" y="60" font-family="sans-serif" font-weight="700" font-size="26" fill="${TERM_TEXT}">Kangentic</text>
  <text x="${W - 300}" y="58" font-family="monospace" font-size="15" fill="${TERM_SOFT}">Docs   Changelog   GitHub</text>
`);

// 3. Browser tabs - the favicon (F4k) at 16 and an active tab at the same size,
//    plus a 32px sample, in a chrome tab strip.
band("browser tabs - favicon at 16, sample at 32", 72, () => {
  const tab = (x, w, active, title) => `
    <rect x="${x}" y="8" width="${w}" height="40" rx="8" fill="${active ? TAB_ACTIVE : "#e8ebef"}"/>
    ${img(fav16, x + 14, 24, 16)}
    <text x="${x + 40}" y="33" font-family="sans-serif" font-size="14" fill="${INK}">${title}</text>`;
  return `
    <rect width="${W}" height="72" fill="${TAB_BAR}"/>
    ${tab(PAD, 220, true, "Kangentic")}
    ${tab(PAD + 232, 220, false, "Kangentic docs")}
    <text x="${W - 260}" y="34" font-family="monospace" font-size="13" fill="${INK_SOFT}">32px:</text>
    ${img(fav32, W - 200, 12, 32)}`;
});

// 4. Desktop app title bar, dark and light - the theme-tinted in-app marks:
//    mono-amber (theme-tinted disc, amber card - the default themed lockup)
//    and pure mono (strict monochrome), each tinted with the theme
//    foreground, in the app-lockup context at 20px (the app renders it
//    w-5), with a 24/32/40 size run, the colored F4k for comparison, and a
//    x8 nearest zoom of the 24px render (pixel truth). Tints are passed
//    explicitly because rasterizers resolve currentColor to black; this
//    mock stands in for the consumer's CSS color.
const f4k24 = await f4k(24);
async function themeBand(caption, surface, tint, softFill) {
  const variants = [
    { name: "mono-amber", make: (s) => f4kDuoSvg(tint, s) },
    { name: "mono", make: (s) => f4kMonoSvg(tint, s) },
  ];
  const RH = 232;
  let inner = `<rect width="${W}" height="${RH * variants.length}" fill="${surface}"/>`;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const y0 = i * RH;
    const b = async (s) => (await png(v.make(s))).toString("base64");
    const zoomed = (
      await sharp(await png(v.make(24)))
        .resize(24 * 8, 24 * 8, { kernel: "nearest" })
        .png()
        .toBuffer()
    ).toString("base64");
    inner += `
      ${img(await b(20), PAD, y0 + 30, 20)}
      <text x="${PAD + 32}" y="${y0 + 46}" font-family="sans-serif" font-weight="600" font-size="15" fill="${tint}">Kangentic</text>
      ${img(await b(24), PAD + 180, y0 + 28, 24)}
      ${img(await b(32), PAD + 228, y0 + 24, 32)}
      ${img(await b(40), PAD + 284, y0 + 20, 40)}
      <text x="${PAD + 370}" y="${y0 + 45}" font-family="monospace" font-size="13" fill="${softFill}">${v.name}</text>
      <text x="${W - 232}" y="${y0 + 18}" font-family="monospace" font-size="13" fill="${softFill}">24px x8</text>
      ${img(zoomed, W - 232, y0 + 26, 192)}`;
  }
  inner += `
    <text x="${PAD + 500}" y="45" font-family="monospace" font-size="13" fill="${softFill}">colored F4k 24px:</text>
    ${img(f4k24, PAD + 650, 28, 24)}`;
  band(caption, RH * variants.length, () => inner);
}
await themeBand("desktop app title bar (dark) - in-app marks tinted with the theme foreground", TERMINAL, TERM_TEXT, TERM_SOFT);
await themeBand("desktop app title bar (light) - in-app marks tinted ink", CREAM, INK, INK_SOFT);

await render("in-situ.png");

// ---------------------------------------------------------------------------
// MOBILE sheet: the OS-owned surfaces that ship in resources/mobile/. These
// are judged in their real context (dark home screen, tinted home screen,
// status bar, launcher mask, Play listing) because none of them are visible
// on the site header the sheet above mocks.
//
// The SHIPPED artifacts are read back from resources/mobile/ rather than
// re-derived, so this reviews exactly what consumers get. Only ALTERNATES
// (the tinted candidate that lost, the feature-graphic ground candidates) are
// built here.
// ---------------------------------------------------------------------------
const MOB = join(ROOT, "resources", "mobile");
const shipped = async (name) => (await readFile(join(MOB, name))).toString("base64");
const b64 = (buf) => buf.toString("base64");
const imgRect = (data, x, y, w, h) =>
  `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${data}"/>`;
// The two recolor models this sheet uses, and neither is sharp's .tint():
// `templateTinted` paints a solid color through the artwork's alpha (for the
// alpha-only OS surfaces), `systemTinted` scales a color by the artwork's own
// luminance (for the one grayscale surface). Both are asserted, below.
//
// Corrected 2026-07-29. This block used to carry a `tinted` helper wrapping
// sharp's .tint(), described as "a faithful stand-in for the real rendering"
// because it maps chroma in LAB with luminance preserved. Measured, it is not a
// stand-in at all at the top of the range: preserving luminance pins white, so
// `.tint("#c0562f")` on a 255,255,255 pixel returns 255,255,255 unchanged. Three
// bands of this sheet were built on it and demonstrated nothing: the
// notification icon drew white on a white card and was invisible; the two
// Android themed tiles came out byte-identical pure white under captions
// promising two different wallpaper tints; and the tinted band's candidate A
// rendered three identical cells, so the A-vs-B call that band exists to settle
// could not be read off it. That is not bad luck. Three of the four artworks
// here are pure white by design and the fourth is grayscale with a white card,
// because these are alpha-shaped OS surfaces - so white is exactly the input
// .tint() cannot touch.
//
// A recolor helper that silently returns its source is the exact defect this
// file just fixed, so it is asserted rather than trusted. Precedent and
// threshold: assertTemplateImage() in gen-ui.mjs - alpha under 251 is an
// antialiased edge, where coverage is the point and color is not.
const assertRecolored = (data, info, color, label) => {
  if (color.toLowerCase() === "#ffffff") return; // white on white is the ask, not a no-op
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 251) continue;
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
      throw new Error(
        `${label}: an opaque pixel is still pure white after recoloring to ${color}. ` +
          "The recolor is a no-op and the band would demonstrate nothing (brand-record-fidelity).",
      );
    }
  }
};
const recolored = async (pipeline, color, label) => {
  const buf = await pipeline.png().toBuffer();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assertRecolored(data, info, color, label);
  return b64(buf);
};

// A TEMPLATE image carries no color of its own: the OS DISCARDS every color
// channel and paints the tint through the alpha channel. UIKit does this to a
// tab icon, Android does it to a notification small icon (the
// expo-notifications `color` option) and to the Android 13+ monochrome layer.
// Rebuild it the way they do: solid color, the shipped file's alpha as the mask.
const templateTinted = async (name, color) => {
  const src = join(MOB, name);
  const { width, height } = await sharp(src).metadata();
  const alpha = await sharp(src).ensureAlpha().extractChannel("alpha").png().toBuffer();
  return recolored(
    sharp({ create: { width, height, channels: 3, background: color } }).joinChannel(alpha),
    color,
    name,
  );
};

// The iOS tinted app icon is the one surface here whose artwork is genuinely
// GRAYSCALE rather than alpha-only, so it wants a luminance ramp and not a flat
// mask. This sheet stands in for the system tint with a gradient map: the
// artwork's own luminance scales how much of the tint each pixel gets, so white
// artwork renders as the full tint, mid-grey as a darker one, and transparency
// survives untouched. It takes a Buffer or a path, because one of the two
// candidates it renders is built in-process and never hits disk.
//
// What this does NOT claim is that it reproduces Apple's compositor, which is
// not measurable from this repo. The reason it replaced .tint() is measurable
// and sufficient: a stand-in that cannot move the brightest artwork in the
// image cannot demonstrate a tint at all.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const systemTinted = async (input, color, label) => {
  const [r, g, b] = rgb(color);
  return recolored(sharp(input).ensureAlpha().linear([r / 255, g / 255, b / 255], [0, 0, 0]), color, label);
};

const m = newSheet();
const iosLight = await shipped("ios-appstore-1024.png");
const iosDark = await shipped("ios-appstore-1024-dark.png");
const iosTint = await shipped("ios-appstore-1024-tinted.png");
// Apple's dark material is a subtle gradient; these two flats bracket its range.
const DARK_HI = "#313131";
const DARK_LO = "#141414";
const TINT_BLUE = "#4a7fd4";
const TINT_GREEN = "#3f9a63";

// 1. The three iOS variants, each on the material the system puts behind it,
//    at 120 (inspection) and 60 (actual home-screen size).
m.band("ios app icon variants - light / dark / tinted, on the system material, at 120 and at 60", 210, () => {
  const cells = [
    { data: iosDark, ground: DARK_HI, label: "dark on #313131" },
    { data: iosDark, ground: DARK_LO, label: "dark on #141414" },
    { data: iosLight, ground: "#8d8577", label: "light (opaque)" },
  ];
  let out = `<rect width="${W}" height="210" fill="#2a2a2a"/>`;
  let x = PAD;
  for (const c of cells) {
    out += `<rect x="${x}" y="16" width="120" height="120" rx="27" fill="${c.ground}"/>
      ${imgRect(c.data, x, 16, 120, 120)}
      <rect x="${x + 140}" y="76" width="60" height="60" rx="14" fill="${c.ground}"/>
      ${imgRect(c.data, x + 140, 76, 60, 60)}
      <text x="${x}" y="164" font-family="monospace" font-size="12" fill="#c9c2b6">${c.label}</text>
      <text x="${x + 140}" y="182" font-family="monospace" font-size="11" fill="#8a8378">60px</text>`;
    x += 230;
  }
  return out;
});

// 2. The tinted variant under real tints, plus the candidate that lost. The
//    call this band exists to settle: does the card survive as a brighter
//    chip (B, shipped) or should it be knocked out like the mono mark (A)?
const altTintSvg = knockout(256, f4kAlphaParts().holes, "", "#ffffff");
const altTintRaw = await png(altTintSvg);
const altTint = b64(altTintRaw);
// Both candidates go through ONE model. Candidate A is pure white by
// construction (line above passes "#ffffff" as the disc fill), so under the
// luminance-preserving .tint() this used to call, all three of its cells
// rendered identically and the A-vs-B call could not be read off this band at
// all. Drawing the two rows with two different tinting models would not fix
// that - it would just make the comparison unfair in a subtler way.
const shipTint = join(MOB, "ios-appstore-1024-tinted.png");
const altTintBlue = await systemTinted(altTintRaw, TINT_BLUE, "candidate A / blue");
const shipTintBlue = await systemTinted(shipTint, TINT_BLUE, "candidate B / blue");
const shipTintGreen = await systemTinted(shipTint, TINT_GREEN, "candidate B / green");
const altTintGreen = await systemTinted(altTintRaw, TINT_GREEN, "candidate A / green");
m.band("ios TINTED candidates - B (shipped: card as a brighter chip) vs A (card knocked out). grayscale, then system-tinted, at 120 and 60", 200, () => {
  const rows = [
    { label: "B  SHIPPED  disc a8a8a8 / card ffffff", gray: iosTint, blue: shipTintBlue, green: shipTintGreen },
    { label: "A  alternate  white disc, card as 4th hole", gray: altTint, blue: altTintBlue, green: altTintGreen },
  ];
  let out = `<rect width="${W}" height="200" fill="#2a2a2a"/>`;
  let ry = 8;
  for (const r of rows) {
    let x = PAD;
    for (const d of [r.gray, r.blue, r.green]) {
      out += `<rect x="${x}" y="${ry}" width="84" height="84" rx="19" fill="#3a3a3a"/>
        ${imgRect(d, x, ry, 84, 84)}
        <rect x="${x + 94}" y="${ry + 24}" width="60" height="60" rx="14" fill="#3a3a3a"/>
        ${imgRect(d, x + 94, ry + 24, 60, 60)}`;
      x += 180;
    }
    out += `<text x="${x + 4}" y="${ry + 48}" font-family="monospace" font-size="12" fill="#c9c2b6">${r.label}</text>`;
    ry += 96;
  }
  return out;
});

// 3. Notification icon in the status bar at its real 24px, plus pixel truth.
const notif = await shipped("notification-icon.png");
const notifSrc = join(MOB, "notification-icon.png");
const notifZoom = b64(await sharp(notifSrc).resize(24 * 8, 24 * 8, { kernel: "nearest" }).png().toBuffer());
// In the shade the OS tints the small icon with the notification color (the
// expo-notifications `color` option), so mocking it white-on-white would be a
// lie. Rust is what the app should set that option to. This comment said as
// much while the line below did exactly that: the icon is white, the shade card
// is #ffffff, and .tint() could not move either.
const notifRust = await templateTinted("notification-icon.png", RUST);
m.band("android notification icon - 24px in the status bar (OS keeps ALPHA ONLY and tints it), plus 24px x8", 210, () => `
  <rect width="${W}" height="210" fill="#f2efe9"/>
  <rect x="${PAD}" y="8" width="420" height="28" fill="${TERMINAL}"/>
  ${imgRect(notif, PAD + 10, 10, 24, 24)}
  ${imgRect(notif, PAD + 42, 10, 24, 24)}
  <text x="${PAD + 300}" y="27" font-family="monospace" font-size="12" fill="${TERM_SOFT}">9:41</text>
  <text x="${PAD + 434}" y="27" font-family="monospace" font-size="12" fill="${INK_SOFT}">status bar: white on the dark bar</text>
  <rect x="${PAD}" y="48" width="420" height="64" rx="10" fill="#ffffff"/>
  ${imgRect(notifRust, PAD + 14, 62, 22, 22)}
  <text x="${PAD + 46}" y="72" font-family="sans-serif" font-size="13" font-weight="600" fill="${INK}">Kangentic</text>
  <text x="${PAD + 46}" y="92" font-family="sans-serif" font-size="12" fill="${INK_SOFT}">Agent finished on task #24</text>
  <text x="${PAD + 434}" y="86" font-family="monospace" font-size="12" fill="${INK_SOFT}">shade: tinted with the app color (rust)</text>
  <text x="${PAD}" y="134" font-family="monospace" font-size="12" fill="${INK_SOFT}">white-on-transparent (mono-tuned geometry: this is the one 24dp surface)</text>
  <text x="${W - 232}" y="14" font-family="monospace" font-size="12" fill="${INK_SOFT}">24px x8</text>
  <rect x="${W - 232}" y="22" width="192" height="192" fill="${TERMINAL}"/>
  ${imgRect(notifZoom, W - 232, 22, 192, 192)}
`);

// 3b. The Board tab icon in a real iOS tab bar, at its true 25pt, plus pixel
//     truth. Same template-image contract as the notification icon above: iOS
//     discards color and renders the ALPHA channel in the bar's tint, so mocking
//     it as shipped (white) would be a lie on a light bar. The band exists to
//     settle one thing a size strip cannot: at 25px, beside the F4k brandmark
//     that is ITSELF a board glyph, does this still read as its own mark?
const tabGlyph = UI_GLYPHS[0];
const tab1x = uiRasterFileFor(tabGlyph, UI_TAB_SIZES[0]);
const tabSrc = join(MOB, tab1x);
const tabZoom = b64(await sharp(tabSrc).resize(25 * 8, 25 * 8, { kernel: "nearest" }).png().toBuffer());
const tabActive = await templateTinted(tab1x, RUST);
const tabIdle = await templateTinted(tab1x, "#8a8378");
const tabOnDark = await templateTinted(tab1x, "#e8a33d");
const tabIdleDark = await templateTinted(tab1x, "#7d766c");
const brandAt25 = b64(await png(knockout(25, F4K.holes, F4K.filled)));
m.band(`ios Board tab icon - ${tab1x} at true 25px, tinted active/inactive, light bar and dark bar`, 250, () => `
  <rect width="${W}" height="250" fill="#e8e6e1"/>
  <rect x="${PAD}" y="8" width="420" height="64" fill="#f7f5f2"/>
  ${imgRect(tabActive, PAD + 60, 16, 25, 25)}
  <text x="${PAD + 72}" y="56" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${RUST}">Board</text>
  ${imgRect(tabIdle, PAD + 200, 16, 25, 25)}
  <text x="${PAD + 212}" y="56" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#8a8378">Board</text>
  <text x="${PAD + 300}" y="44" font-family="monospace" font-size="11" fill="${INK_SOFT}">light bar</text>
  <rect x="${PAD}" y="84" width="420" height="64" fill="${TERMINAL}"/>
  ${imgRect(tabOnDark, PAD + 60, 92, 25, 25)}
  <text x="${PAD + 72}" y="132" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#e8a33d">Board</text>
  ${imgRect(tabIdleDark, PAD + 200, 92, 25, 25)}
  <text x="${PAD + 212}" y="132" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#7d766c">Board</text>
  <text x="${PAD + 300}" y="120" font-family="monospace" font-size="11" fill="${TERM_SOFT}">dark bar</text>
  <text x="${PAD}" y="176" font-family="monospace" font-size="12" fill="${INK_SOFT}">adjacency at 25: the tab glyph beside the F4k brandmark it must not be mistaken for</text>
  <rect x="${PAD}" y="188" width="41" height="41" rx="9" fill="#f7f5f2"/>
  ${imgRect(tabActive, PAD + 8, 196, 25, 25)}
  ${imgRect(brandAt25, PAD + 70, 196, 25, 25)}
  <text x="${PAD + 110}" y="212" font-family="monospace" font-size="11" fill="${INK_SOFT}">kanban tab / F4k brandmark</text>
  <text x="${W - 232}" y="14" font-family="monospace" font-size="12" fill="${INK_SOFT}">25px x8</text>
  <rect x="${W - 232}" y="22" width="200" height="200" fill="${TERMINAL}"/>
  ${imgRect(tabZoom, W - 232, 22, 200, 200)}
`);

// 4. The Android 13+ themed layer on the two grounds launchers actually use.
//    The monochrome layer is alpha-only white (gen-icons.mjs:164), so the
//    launcher's wallpaper-derived tint is painted through its alpha.
const monoTint = (color) => templateTinted("android-adaptive-monochrome.png", color);
const monoA = await monoTint("#b9c7a8");
const monoB = await monoTint("#d8b48a");
// The caption says GROUNDS, not "masked": the circle and squircle below are
// <circle>/<rect rx> painted BEHIND a square <image>, and it is the artwork's
// own alpha that shapes the mark. Claiming a mask this band does not apply is
// the same overstatement as the tint it used to promise.
m.band("android 13+ themed icon - the monochrome layer tinted from wallpaper, on the two grounds launchers use (circle + squircle)", 160, () => {
  const tiles = [
    { d: monoA, bg: "#3c4432" },
    { d: monoB, bg: "#4a3a2b" },
  ];
  let out = `<rect width="${W}" height="160" fill="#2a2a2a"/>`;
  let x = PAD;
  for (const t of tiles) {
    out += `<circle cx="${x + 54}" cy="62" r="54" fill="${t.bg}"/>
      ${imgRect(t.d, x, 8, 108, 108)}
      <rect x="${x + 130}" y="8" width="108" height="108" rx="26" fill="${t.bg}"/>
      ${imgRect(t.d, x + 130, 8, 108, 108)}`;
    x += 280;
  }
  out += `<text x="${PAD}" y="140" font-family="monospace" font-size="12" fill="#c9c2b6">alpha-shaped, canonical F4k geometry, card knocked out as a fourth hole</text>`;
  return out;
});

// 5. Play feature graphic: the shipped ground against candidates, at listing
//    size and at the thumbnail size Play actually shows in the grid.
const fgGrounds = [
  { name: "PANEL f6f1e8  SHIPPED", ground: PANEL },
  { name: "CREAM fdfbf7  (near-white; Play warns off it)", ground: CREAM },
  { name: "TERMINAL 1d1915  (dark) - REJECTED: ink text vanishes", ground: "#1d1915" },
];
const fgShots = [];
for (const g of fgGrounds) {
  fgShots.push({ ...g, data: b64(await sharp(Buffer.from(featureGraphicSvg(g.ground))).flatten({ background: g.ground }).png().toBuffer()) });
}
const FG_PITCH = 235;
m.band("play feature graphic 1024x500 - ground candidates, at 440 wide and at Play's grid thumbnail", 3 * FG_PITCH + 16, () => {
  let out = `<rect width="${W}" height="${3 * FG_PITCH + 16}" fill="#e8e6e1"/>`;
  let ry = 8;
  for (const s of fgShots) {
    out += `${imgRect(s.data, PAD, ry, 440, 215)}
      ${imgRect(s.data, PAD + 460, ry + 54, 220, 107)}
      <text x="${PAD + 700}" y="${ry + 112}" font-family="monospace" font-size="12" fill="#4a463f">${s.name}</text>`;
    ry += FG_PITCH;
  }
  return out;
});

await m.render("mobile.png");
