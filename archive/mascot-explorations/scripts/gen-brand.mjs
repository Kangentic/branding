// gen-brand.mjs - build-time dev tool. Regenerates brand raster assets in the
// Warm Craft palette using sharp (already a dependency; no browser needed):
//   - public/og-image.png (1200x630): cream ground, ink pixel wordmark, rust
//     rule, rust pixel kangaroo. Text is drawn as pixel-font rects so there is
//     no system-font dependency.
//   - public/logo-pixel.png : pixel-mark "K" (rust) - candidate for sign-off.
//   - public/logo-rust.png / logo-ink.png : the existing "K" recolored by
//     masking its alpha - candidates for sign-off.
// Live logo.png / favicons are NOT touched.

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public");

const CREAM = "#fdfbf7";
const INK = "#24201b";
const RUST = "#c0562f";
const AMBER = "#e8a33d";

// --- pixel helpers ---------------------------------------------------------
const parse = (m) => m.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));

// Run-length rects for a filled ("#") map, in grid units, with a given fill.
function rects(map, fill) {
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

// The amber Overseer (matches gen-sprites.mjs overseerAmber) - a soft
// golden blob with three sparkle eyes, side arms, three feet. 18x12.
const rooMap = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aao+aao+aao+aa..
..aaooaaooaaooaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;
function rooRects() {
  const PAL = { "#": RUST, o: INK, "+": CREAM, a: AMBER };
  const g = parse(rooMap);
  const h = g.length;
  const w = Math.max(...g.map((r) => r.length));
  const out = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = g[y][x] ?? ".";
      if (!PAL[ch]) { x++; continue; }
      let run = 1;
      while (x + run < w && (g[y][x + run] ?? ".") === ch) run++;
      out.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PAL[ch]}"/>`);
      x += run;
    }
  }
  return { svg: out.join(""), w, h };
}

// --- 5x7 pixel font (only the glyphs the wordmark needs) -------------------
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

// Lay a word out as rects in grid units (1px gap between glyphs).
function word(text, fill) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const { svg, w } = rects(FONT[ch], fill);
    parts.push(`<g transform="translate(${x},0)">${svg}</g>`);
    x += w + 1;
  }
  return { svg: parts.join(""), w: x - 1, h: 7 };
}

// --- OG image --------------------------------------------------------------
async function og() {
  const W = 1200;
  const H = 630;
  const mark = word("KANGENTIC", INK);
  const wordScale = 11; // 7px glyphs -> 77px tall
  const wordX = 96;
  const wordY = 232;
  const ruleY = wordY + mark.h * wordScale + 34;
  const roo = rooRects();
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
  await sharp(Buffer.from(svg)).png().toFile(join(PUB, "og-image.png"));
  console.log(`og-image.png  ${W}x${H}`);
}

// --- Logo candidates -------------------------------------------------------
async function pixelK() {
  const size = 512;
  // Chunky 8x10 K so the diagonals read as solid strokes, not diamonds.
  const k = rects(
    "##....##\n##...##.\n##..##..\n##.##...\n####....\n####....\n##.##...\n##..##..\n##...##.\n##....##",
    RUST
  );
  const scale = 40; // 8x10 -> 320x400
  const gx = Math.round((size - k.w * scale) / 2);
  const gy = Math.round((size - k.h * scale) / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges"><g transform="translate(${gx},${gy}) scale(${scale})">${k.svg}</g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(PUB, "logo-pixel.png"));
  console.log("logo-pixel.png  512x512 (rust)");
}

async function recolor(name, hex) {
  const src = sharp(join(PUB, "logo.png")).ensureAlpha();
  const meta = await src.metadata();
  const { width, height } = meta;
  const alpha = await src.clone().extractChannel("alpha").raw().toBuffer();
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  await sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(join(PUB, name));
  console.log(`${name}  ${width}x${height} (recolored ${hex})`);
}

await og();
await pixelK();
await recolor("logo-rust.png", RUST);
await recolor("logo-ink.png", INK);
console.log("done");
