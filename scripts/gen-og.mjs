// gen-og.mjs - the social share image. Warm Craft: cream ground, ink pixel
// wordmark, rust rule, the amber Overseer. Text is drawn as pixel-font
// rects so there is no system-font dependency at render time. Both shared
// libs supply their piece: the mascot from lib/sprite.mjs, the 5x7 plate
// font from lib/pixelfont.mjs (also used by the Play feature graphic).
//
// Usage: npm run gen:og
// Output: resources/social/og-image.png (1200x630)

import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { OVERSEER, rects as spriteRects, PALETTE } from "./lib/sprite.mjs";
import { PROOF_LINE, word } from "./lib/pixelfont.mjs";
import { CREAM, INK, INK_SOFT, RUST } from "./lib/mark.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "resources", "social");

const W = 1200;
const H = 630;
const mark = word("KANGENTIC", INK);
const wordScale = 11; // 7px glyphs -> 77px tall
const wordX = 96;
const wordY = 232;
const ruleY = wordY + mark.h * wordScale + 34;
const tag = word(PROOF_LINE, INK_SOFT);
const tagScale = 3; // 7px glyphs -> 21px tall proof-line caption
const roo = spriteRects(OVERSEER, { unit: 1, palette: PALETTE });
const rooScale = 23; // 18x12 grid -> 414x276
const rooX = W - roo.w * rooScale - 40;
const rooY = (H - roo.h * rooScale) / 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${RUST}"/>
  <g transform="translate(${wordX},${wordY}) scale(${wordScale})">${mark.svg}</g>
  <rect x="${wordX}" y="${ruleY}" width="${Math.round(mark.w * wordScale * 0.62)}" height="12" fill="${RUST}"/>
  <g transform="translate(${wordX},${ruleY + 34}) scale(${tagScale})">${tag.svg}</g>
  <g transform="translate(${rooX},${rooY}) scale(${rooScale})">${roo.svg}</g>
</svg>`;

await mkdir(OUT, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(join(OUT, "og-image.png"));
console.log(`Wrote resources/social/og-image.png (${W}x${H})`);
