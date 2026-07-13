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

import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { knockout, f4kParts, f4kMonoSvg, cardKParts } from "./lib/mark.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "exploration", "review");
await mkdir(OUT, { recursive: true });

// Warm Craft surfaces (design-language tokens). Kept local: these are mock
// chrome colors, not mark geometry.
const CREAM = "#fdfbf7";
const INK = "#24201b";
const INK_SOFT = "#6e6659";
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
const parts = [];
let y = 0;

// A captioned band: a monospace caption strip, then the mock content.
function band(caption, height, content) {
  parts.push(`<text x="${PAD}" y="${y + 20}" font-family="monospace" font-size="13" fill="#9a8f7d">${caption}</text>`);
  const top = y + 32;
  parts.push(`<g transform="translate(0,${top})">${content(top)}</g>`);
  y = top + height + 28;
}

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

// 4. Desktop app title bar, dark and light - the MONO F4k (the
//    assets/brandmark-mono.svg geometry) tinted with the theme foreground,
//    the app-lockup context at 20px (the app renders it w-5), a 24/32/40
//    size run, the colored F4k for comparison, and a x8 nearest zoom of the
//    24px render (pixel truth). Tints are passed explicitly because
//    rasterizers resolve currentColor to black; this mock stands in for the
//    consumer's CSS color.
const f4k24 = await f4k(24);
async function monoBand(caption, surface, tint, softFill) {
  const mono = async (s) => (await png(f4kMonoSvg(tint, s))).toString("base64");
  const zoomed = (
    await sharp(await png(f4kMonoSvg(tint, 24)))
      .resize(24 * 8, 24 * 8, { kernel: "nearest" })
      .png()
      .toBuffer()
  ).toString("base64");
  const m20 = await mono(20);
  const m24 = await mono(24);
  const m32 = await mono(32);
  const m40 = await mono(40);
  band(caption, 232, () => `
    <rect width="${W}" height="232" fill="${surface}"/>
    ${img(m20, PAD, 30, 20)}
    <text x="${PAD + 32}" y="46" font-family="sans-serif" font-weight="600" font-size="15" fill="${tint}">Kangentic</text>
    ${img(m24, PAD + 180, 28, 24)}
    ${img(m32, PAD + 228, 24, 32)}
    ${img(m40, PAD + 284, 20, 40)}
    <text x="${PAD + 370}" y="45" font-family="monospace" font-size="13" fill="${softFill}">colored F4k 24px:</text>
    ${img(f4k24, PAD + 520, 28, 24)}
    <text x="${W - 232}" y="18" font-family="monospace" font-size="13" fill="${softFill}">24px x8</text>
    ${img(zoomed, W - 232, 26, 192)}
  `);
}
await monoBand("desktop app title bar (dark) - mono F4k tinted with the theme foreground", TERMINAL, TERM_TEXT, TERM_SOFT);
await monoBand("desktop app title bar (light) - mono F4k tinted ink", CREAM, INK, INK_SOFT);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}">
  <rect width="${W}" height="${y}" fill="#ffffff"/>
  ${parts.join("\n")}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(OUT, "in-situ.png"));
console.log(`Wrote in-situ header mocks to ${join(OUT, "in-situ.png")}`);
