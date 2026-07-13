// lib/sprite.mjs - the canonical pixel-art sprite engine. Every mascot/
// sprite generator imports from here; the token palette and the canonical
// Overseer map are declared once. Rules (see the sprite-drafting skill):
//   - rect-grid SVG, shape-rendering: crispEdges (pixels stay crisp)
//   - <= 4 token colors per sprite, drawn from the Warm Craft palette
//   - integer pixel scaling only (fractional scale blurs the craft)

// Token palette (<= 4 used per sprite). Keys are the ASCII-map characters.
export const PALETTE = {
  a: "#e8a33d", // amber body (the mascot's sanctioned full-weight amber)
  r: "#c0562f", // rust (alternate body / fur / accents)
  k: "#24201b", // ink details / eye
  c: "#fdfbf7", // cream sparkle / highlight
  ".": null, // transparent
};

// THE MASCOT: the amber Overseer (18 wide x 12 tall) - a soft golden blob
// with three sparkle eyes (it watches all your agents at once; the three
// eyes echo three board columns), side arms out, three feet. Amber body
// deliberately: warm and friendly without echoing Claude Code's terracotta
// critter. `a` amber, `k` ink eye, `c` cream sparkle.
export const OVERSEER = `
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

// Animation pose frames: variations of the ONE canonical map above (same
// 18x12 grid, so frames overlay pixel-perfectly when a consumer swaps
// them). Every row a pose does not animate stays byte-identical to
// OVERSEER; gen-sprites.mjs asserts this. Sequencing lives consumer-side
// as a stepped frame swap (steps() between 2-4 poses, never tweened),
// resting on the canonical frame under prefers-reduced-motion.

// Blink: all three eyes closed at once. Differs from OVERSEER in row 3
// only (the sparkle row closes; the ink line on row 4 reads as shut lids).
export const OVERSEER_BLINK = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

// Wave: the viewer-right arm (the 2x2 nub at cols 16-17) lifted one row,
// from rows 5-6 to rows 4-5, keeping its 2x2 size. Differs from OVERSEER
// in rows 4 and 6. The wave is a 2-pose toggle (rest <> wave); the hand
// peaks at the lower eye line (row 4), never above it.
export const OVERSEER_WAVE = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
..aakkaakkaakkaaaa
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

export function parseMap(map) {
  return map.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));
}

// Run-length-merge same-color cells per row into <rect> runs. `palette`
// maps map-characters to fills (defaults to PALETTE); a null/absent entry
// is transparent. Returns { svg, w, h } in grid units * unit.
export function rects(map, { unit = 1, palette = PALETTE } = {}) {
  const grid = parseMap(map);
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const out = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = grid[y][x] ?? ".";
      const color = palette[ch] ?? null;
      if (color === null) { x++; continue; }
      let run = 1;
      while (x + run < w && (grid[y][x + run] ?? ".") === ch) run++;
      out.push(`<rect x="${x * unit}" y="${y * unit}" width="${run * unit}" height="${unit}" fill="${color}"/>`);
      x += run;
    }
  }
  return { svg: out.join(""), w, h };
}

// A complete, standalone sprite SVG document. viewBox in grid units so CSS
// sizes it; crispEdges keeps the pixels sharp at any integer scale.
export function buildSvg(map, { unit = 1, label = "Pixel-art Kangentic mascot", palette = PALETTE } = {}) {
  const { svg, w, h } = rects(map, { unit, palette });
  const W = w * unit;
  const H = h * unit;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges" role="img" aria-label="${label}">${svg}</svg>`;
}
