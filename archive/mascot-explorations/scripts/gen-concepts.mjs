// gen-concepts.mjs - build-time exploration tool. Round 3: ONE idea, four
// executions - the kanban board itself as a cute creature (Overseer/Stax
// energy inside a Cardling/Board-Bot body). Eyes live on the bezel ABOVE the
// column slots (not a screen face), plus little arms/antenna/feet. The
// visible columns + amber card are what keep it apart from Claude Code's
// plain rectangle-with-eyes icon.
//
// Usage: node scripts/gen-concepts.mjs
// Output: scripts/sprites/concepts/<name>.png + scripts/sprites/concepts-board.png
// (round 1 + 2 renders in the same folders are kept)

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "sprites", "concepts");

const PALETTE = {
  r: "#c0562f", // rust
  k: "#24201b", // ink
  c: "#fdfbf7", // cream (also the eye sparkle)
  a: "#e8a33d", // amber (the card in flight)
  o: "#b57e29", // ochre (color study: 3.3:1 on cream, 5:1 on warm black)
  ".": null,
};

const parse = (m) => m.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));

function rects(map, unit = 1) {
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
      out.push(`<rect x="${x * unit}" y="${y * unit}" width="${run * unit}" height="${unit}" fill="${color}"/>`);
      x += run;
    }
  }
  return { svg: out.join(""), w, h };
}

// A. PORTRAIT - upright board creature: antenna, bezel eyes, three column
// slots with an amber card working through the middle, arm stubs, feet.
const portrait = `
.......aa.......
.......rr.......
..rrrrrrrrrrrr..
.rrrrrrrrrrrrrr.
.rrkcrrrrrrkcrr.
.rrkkrrrrrrkkrr.
.rrrrrrrrrrrrrr.
rrrccrrccrrccrrr
rrrccrrccrrccrrr
.rrccrraarrccrr.
.rrccrraarrccrr.
.rrccrrccrrccrr.
.rrccrrccrrccrr.
.rrrrrrrrrrrrrr.
..rrrrrrrrrrrr..
...rr......rr...
...rr......rr...
`;

// B. LANDSCAPE - wide board creature: same anatomy, wider stance, bigger
// column slots. Reads most like the actual product.
const landscape = `
.........aa.........
.........rr.........
..rrrrrrrrrrrrrrrr..
.rrrrrrrrrrrrrrrrrr.
.rrrrkcrrrrrkcrrrrr.
.rrrrkkrrrrrkkrrrrr.
.rrrrrrrrrrrrrrrrrr.
rrrccccrccccrccccrrr
rrrccccrccccrccccrrr
.rrccccraaaarccccrr.
.rrccccraaaarccccrr.
.rrrrrrrrrrrrrrrrrr.
..rrrrrrrrrrrrrrrr..
...rr..........rr...
`;

// C. THE JUGGLER - Stax with an antenna, mid-juggle: an amber card floating
// above its right column-arm. The columns ARE the limbs.
const juggler = `
.......aa.......
.......rr.......
....rrrrrrrr....
....rrrrrrrr..aa
....rkcrrkcr..aa
....rkkrrkkr....
....rrrrrrrr....
rrr.rrrrrrrr.rrr
rrr.rrrrrrrr.rrr
rrr.rrrrrrrr.rrr
rrr.rrrrrrrr.rrr
rrrrrrrrrrrrrrrr
rrrrrrrrrrrrrrrr
..rr...rr...rr..
..rr...rr...rr..
`;

// D. MINI - the favicon-sized reduction: board body, bezel eyes, three
// slots, amber card, feet. No limbs; tests how small the idea survives.
const mini = `
.rrrrrrrrrr.
rrrrrrrrrrrr
rrkcrrrrkcrr
rrkkrrrrkkrr
rrrrrrrrrrrr
rrccrccrccrr
rrccraarccrr
rrccraarccrr
rrrrrrrrrrrr
.rrrrrrrrrr.
..rr....rr..
..rr....rr..
`;

// E. OVERSEER WITH ARMS - the round-2 favorite, now with side arms out.
// Comparison option per Tyler; the landscape board is the current pick.
const overseerArms = `
.....rrrrrrrr.....
...rrrrrrrrrrrr...
..rrrrrrrrrrrrrr..
..rrkcrrkcrrkcrr..
..rrkkrrkkrrkkrr..
rrrrrrrrrrrrrrrrrr
rrrrrrrrrrrrrrrrrr
..rrrrrrrrrrrrrr..
..rrrrrrrrrrrrrr..
...rrrrrrrrrrrr...
....rr..rr..rr....
....rr..rr..rr....
`;

const concepts = [
  { name: "board-portrait", label: "A PORTRAIT", map: portrait, scale: 13 },
  { name: "board-landscape", label: "B LANDSCAPE (picked)", map: landscape, scale: 12 },
  { name: "board-juggler", label: "C THE JUGGLER", map: juggler, scale: 13 },
  { name: "board-mini", label: "D MINI (favicon test)", map: mini, scale: 15 },
  { name: "overseer-arms", label: "E OVERSEER + ARMS", map: overseerArms, scale: 13 },
];

await mkdir(OUT, { recursive: true });

for (const c of concepts) {
  const { svg, w, h } = rects(c.map, 14);
  const pad = 28;
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 14 + pad * 2}" height="${h * 14 + pad * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fdfbf7"/><g transform="translate(${pad},${pad})">${svg}</g></svg>`;
  await sharp(Buffer.from(full)).png().toFile(join(OUT, `${c.name}.png`));
}

// Contact sheet: 2 x 2 grid, labeled
const CELL_W = 430;
const CELL_H = 340;
const cells = concepts.map((c, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const { svg, w, h } = rects(c.map, c.scale);
  const px = col * CELL_W + (CELL_W - w * c.scale) / 2;
  const py = row * CELL_H + 24 + (CELL_H - 78 - h * c.scale) / 2;
  const lx = col * CELL_W + CELL_W / 2;
  const ly = (row + 1) * CELL_H - 22;
  return `<g transform="translate(${Math.round(px)},${Math.round(py)})">${svg}</g>
    <text x="${lx}" y="${ly}" text-anchor="middle" font-family="monospace" font-size="17" letter-spacing="1" fill="#6e6659">${c.label}</text>`;
});
const ROWS = Math.ceil(concepts.length / 2);
const rowLines = Array.from({ length: ROWS - 1 }, (_, i) =>
  `<line x1="20" y1="${CELL_H * (i + 1)}" x2="${CELL_W * 2 - 20}" y2="${CELL_H * (i + 1)}" stroke="rgba(36,32,27,0.12)"/>`
).join("");
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W * 2}" height="${CELL_H * ROWS}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#fdfbf7"/>
  <line x1="${CELL_W}" y1="20" x2="${CELL_W}" y2="${CELL_H * ROWS - 20}" stroke="rgba(36,32,27,0.12)"/>
  ${rowLines}
  ${cells.join("\n")}
</svg>`;
await sharp(Buffer.from(sheet)).png().toFile(join(__dirname, "sprites", "concepts-board.png"));
console.log(`Wrote ${concepts.length} board-creature concepts to ${OUT} and the sheet to scripts/sprites/concepts-board.png`);

// --- Overseer color study: de-confusing from Claude Code's terracotta ------
// Same character, three bodies: rust (current), ink (1-bit craft, vendor-
// neutral), amber-accented ink (ink body, amber eyes).
const inkOverseer = `
.....kkkkkkkk.....
...kkkkkkkkkkkk...
..kkkkkkkkkkkkkk..
..kkcckkcckkcckk..
..kkcckkcckkcckk..
kkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkk
..kkkkkkkkkkkkkk..
..kkkkkkkkkkkkkk..
...kkkkkkkkkkkk...
....kk..kk..kk....
....kk..kk..kk....
`;
const amberEyeOverseer = `
.....kkkkkkkk.....
...kkkkkkkkkkkk...
..kkkkkkkkkkkkkk..
..kkaakkaakkaakk..
..kkaakkaakkaakk..
kkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkk
..kkkkkkkkkkkkkk..
..kkkkkkkkkkkkkk..
...kkkkkkkkkkkk...
....kk..kk..kk....
....kk..kk..kk....
`;
// Warm-but-not-Claude bodies:
// Amber body (golden, distinctly not terracotta), classic sparkle eyes.
const amberOverseer = `
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
// Marshmallow: cream body with a rust pixel outline, ink eyes, rust
// mittens and feet. Outlined-sprite craft; friendliest silhouette.
const marshmallow = `
.....rrrrrrrr.....
...rrccccccccrr...
..rccccccccccccr..
..rckkcckkcckkcr..
..rckkcckkcckkcr..
rrccccccccccccccrr
rrccccccccccccccrr
..rccccccccccccr..
..rccccccccccccr..
...rrrrrrrrrrrr...
....rr..rr..rr....
....rr..rr..rr....
`;
// Ink body warmed by rust arms and feet, cream eyes.
const inkRustLimbs = `
.....kkkkkkkk.....
...kkkkkkkkkkkk...
..kkkkkkkkkkkkkk..
..kkcckkcckkcckk..
..kkcckkcckkcckk..
rrkkkkkkkkkkkkkkrr
rrkkkkkkkkkkkkkkrr
..kkkkkkkkkkkkkk..
..kkkkkkkkkkkkkk..
...kkkkkkkkkkkk...
....rr..rr..rr....
....rr..rr..rr....
`;

// Add a 1-pixel outline around a sprite's silhouette (sticker-style):
// every transparent cell orthogonally touching a filled cell becomes `ch`.
function addOutline(map, ch = "k") {
  const g = parse(map);
  const h = g.length;
  const w = Math.max(...g.map((r) => r.length));
  const get = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? "." : (g[y][x] ?? "."));
  const out = Array.from({ length: h + 2 }, (_, y) =>
    Array.from({ length: w + 2 }, (_, x) => {
      const cell = get(x - 1, y - 1);
      if (cell !== ".") return cell;
      const touches = [get(x - 2, y - 1), get(x, y - 1), get(x - 1, y - 2), get(x - 1, y)]
        .some((c) => c !== "." && c !== ch);
      return touches ? ch : ".";
    })
  );
  return out.map((r) => r.join("")).join("\n");
}
const amberOutlined = addOutline(`
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
`);

const ochreOverseer = `
.....oooooooo.....
...oooooooooooo...
..oooooooooooooo..
..ookcookcookcoo..
..ookkookkookkoo..
oooooooooooooooooo
oooooooooooooooooo
..oooooooooooooo..
..oooooooooooooo..
...oooooooooooo...
....oo..oo..oo....
....oo..oo..oo....
`;

// Amber body with rust shading on the underside (classic sprite shade
// tone): bottom curve, feet, and arm undersides in rust. Anchors the form
// on light grounds without enclosing the silhouette.
const amberShaded = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
rraaaaaaaaaaaaaarr
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...rrrrrrrrrrrr...
....rr..rr..rr....
....rr..rr..rr....
`;

// Amber body with a 1px ink pixel drop shadow (down-right), silhouette open.
function addDropShadow(map, ch = "k") {
  const g = parse(map);
  const h = g.length;
  const w = Math.max(...g.map((r) => r.length));
  const get = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? "." : (g[y][x] ?? "."));
  const out = Array.from({ length: h + 1 }, (_, y) =>
    Array.from({ length: w + 1 }, (_, x) => {
      const cell = get(x, y);
      if (cell !== ".") return cell;
      return get(x - 1, y - 1) !== "." && get(x - 1, y - 1) !== ch ? ch : ".";
    })
  );
  return out.map((r) => r.join("")).join("\n");
}
const amberShadowed = addDropShadow(`
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
`);

const amberRustShadow = addDropShadow(`
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
`, "r");

const amberRustOutlined = addOutline(`
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
`, "r");

const colorStudy = [
  { name: "overseer-rust", label: "RUST (current)", map: overseerArms },
  { name: "overseer-amber-shaded", label: "AMBER + RUST SHADING", map: amberShaded },
  { name: "overseer-amber-rust-outlined", label: "AMBER + RUST OUTLINE", map: amberRustOutlined },
  { name: "overseer-amber-rust-shadow", label: "AMBER + RUST SHADOW", map: amberRustShadow },
  { name: "overseer-amber-shadow", label: "AMBER + PIXEL SHADOW", map: amberShadowed },
  { name: "overseer-amber-outlined", label: "AMBER + INK OUTLINE", map: amberOutlined },
  { name: "overseer-ochre", label: "OCHRE (both-mode solid)", map: ochreOverseer },
  { name: "overseer-amber", label: "AMBER", map: amberOverseer },
  { name: "overseer-marshmallow", label: "MARSHMALLOW", map: marshmallow },
  { name: "overseer-ink-rust-limbs", label: "INK + RUST LIMBS", map: inkRustLimbs },
  { name: "overseer-ink", label: "INK", map: inkOverseer },
  { name: "overseer-amber-eyes", label: "INK + AMBER EYES", map: amberEyeOverseer },
];
// Individual renders for review alongside the sheet
for (const c of colorStudy) {
  const { svg, w, h } = rects(c.map, 14);
  const pad = 28;
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 14 + pad * 2}" height="${h * 14 + pad * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fdfbf7"/><g transform="translate(${pad},${pad})">${svg}</g></svg>`;
  await sharp(Buffer.from(full)).png().toFile(join(OUT, `${c.name}.png`));
}
const SW = 340;
const SH = 300;
const studyCells = colorStudy.map((c, i) => {
  const { svg, w, h } = rects(c.map, 13);
  const px = i * SW + (SW - w * 13) / 2;
  const py = 30 + (SH - 90 - h * 13) / 2;
  return `<g transform="translate(${Math.round(px)},${Math.round(py)})">${svg}</g>
    <text x="${i * SW + SW / 2}" y="${SH - 24}" text-anchor="middle" font-family="monospace" font-size="16" letter-spacing="1" fill="#6e6659">${c.label}</text>`;
});
const studyLines = Array.from({ length: colorStudy.length - 1 }, (_, i) =>
  `<line x1="${SW * (i + 1)}" y1="20" x2="${SW * (i + 1)}" y2="${SH - 20}" stroke="rgba(36,32,27,0.12)"/>`
).join("");
const study = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW * colorStudy.length}" height="${SH}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#fdfbf7"/>
  ${studyLines}
  ${studyCells.join("\n")}
</svg>`;
await sharp(Buffer.from(study)).png().toFile(join(__dirname, "sprites", "overseer-colors.png"));
console.log("Wrote the color study to scripts/sprites/overseer-colors.png");
