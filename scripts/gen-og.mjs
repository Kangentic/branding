// gen-og.mjs - the social share image. Warm Craft: cream ground, ink pixel
// wordmark, rust rule, the amber Overseer. Text is drawn as pixel-font
// rects so there is no system-font dependency at render time. The mascot
// comes from the shared sprite engine (lib/sprite.mjs).
//
// Usage: npm run gen:og
// Output: resources/social/og-image.png (1200x630)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { OVERSEER, rects as spriteRects, PALETTE } from "./lib/sprite.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "resources", "social");

const CREAM = "#fdfbf7";
const INK = "#24201b";
const RUST = "#c0562f";

// --- 5x7 pixel font (only the glyphs the wordmark needs) -------------------
const parse = (m) => m.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));
function glyphRects(map, fill) {
  const g = parse(map);
  const h = g.length;
  const w = Math.max(...g.map((r) => r.length));
  const out = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if ((g[y][x] ?? ".") !== "#") { x++; continue; }
      let run = 1;
      while (x + run < w && (g[y][x + run] ?? ".") === "#") run++;
      out.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  }
  return { svg: out.join(""), w, h };
}
const FONT = {
  K: "#...#\n#..#.\n#.#..\n##...\n#.#..\n#..#.\n#...#",
  A: ".###.\n#...#\n#...#\n#####\n#...#\n#...#\n#...#",
  N: "#...#\n##..#\n#.#.#\n#..##\n#...#\n#...#\n#...#",
  G: ".###.\n#...#\n#....\n#.###\n#...#\n#...#\n.###.",
  E: "#####\n#....\n#....\n####.\n#....\n#....\n#####",
  T: "#####\n..#..\n..#..\n..#..\n..#..\n..#..\n..#..",
  I: ".###.\n..#..\n..#..\n..#..\n..#..\n..#..\n.###.",
  C: ".###.\n#...#\n#....\n#....\n#....\n#...#\n.###.",
};
function word(text, fill) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const { svg, w } = glyphRects(FONT[ch], fill);
    parts.push(`<g transform="translate(${x},0)">${svg}</g>`);
    x += w + 1;
  }
  return { svg: parts.join(""), w: x - 1, h: 7 };
}

const W = 1200;
const H = 630;
const mark = word("KANGENTIC", INK);
const wordScale = 11; // 7px glyphs -> 77px tall
const wordX = 96;
const wordY = 232;
const ruleY = wordY + mark.h * wordScale + 34;
const roo = spriteRects(OVERSEER, { unit: 1, palette: PALETTE });
const rooScale = 23; // 18x12 grid -> 414x276
const rooX = W - roo.w * rooScale - 40;
const rooY = (H - roo.h * rooScale) / 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${RUST}"/>
  <g transform="translate(${wordX},${wordY}) scale(${wordScale})">${mark.svg}</g>
  <rect x="${wordX}" y="${ruleY}" width="${Math.round(mark.w * wordScale * 0.62)}" height="12" fill="${RUST}"/>
  <g transform="translate(${wordX},${ruleY + 40})" font-family="monospace" fill="#6e6659" font-size="26" letter-spacing="1">
    <text x="0" y="20">11 agent CLIs / 100% local / \$0 forever</text>
  </g>
  <g transform="translate(${rooX},${rooY}) scale(${rooScale})">${roo.svg}</g>
</svg>`;

await mkdir(OUT, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(join(OUT, "og-image.png"));
console.log(`Wrote resources/social/og-image.png (${W}x${H})`);
