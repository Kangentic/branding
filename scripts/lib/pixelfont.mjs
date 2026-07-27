// pixelfont.mjs - THE 5x7 plate font. Uppercase-only, in the spirit of
// Departure Mono, drawn as rects so there is ZERO system-font dependency at
// render time and every PNG is byte-identical on any OS (the /release + CI
// determinism gate).
//
// Declared ONCE here. Generators import it; they never re-declare a glyph.
// This lib was extracted from gen-og.mjs when the Play Store feature graphic
// needed the same wordmark - a second copy of a font table is exactly the
// drift that lib/mark.mjs and lib/sprite.mjs exist to prevent.
//
// Coverage is deliberately narrow (the strings the brand actually sets):
//   letters  K A N G E T I C L S O F R V
//   digits   0 1
//   symbols  / % $
// word() THROWS on anything else rather than silently dropping it. To set new
// copy, add the glyph map here first.

const parse = (m) => m.replace(/^\n/, "").replace(/\n$/, "").split("\n").map((r) => r.split(""));

// Run-length-merges the "#" runs of one glyph row into <rect> elements.
// Returns glyph-space geometry (untransformed); the caller scales with a
// <g transform="scale(N)"> at an INTEGER factor.
export function glyphRects(map, fill) {
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

export const FONT = {
  K: "#...#\n#..#.\n#.#..\n##...\n#.#..\n#..#.\n#...#",
  A: ".###.\n#...#\n#...#\n#####\n#...#\n#...#\n#...#",
  N: "#...#\n##..#\n#.#.#\n#..##\n#...#\n#...#\n#...#",
  G: ".###.\n#...#\n#....\n#.###\n#...#\n#...#\n.###.",
  E: "#####\n#....\n#....\n####.\n#....\n#....\n#####",
  T: "#####\n..#..\n..#..\n..#..\n..#..\n..#..\n..#..",
  I: ".###.\n..#..\n..#..\n..#..\n..#..\n..#..\n.###.",
  C: ".###.\n#...#\n#....\n#....\n#....\n#...#\n.###.",
  L: "#....\n#....\n#....\n#....\n#....\n#....\n#####",
  S: ".####\n#....\n#....\n.###.\n....#\n....#\n####.",
  O: ".###.\n#...#\n#...#\n#...#\n#...#\n#...#\n.###.",
  F: "#####\n#....\n#....\n####.\n#....\n#....\n#....",
  R: "####.\n#...#\n#...#\n####.\n#.#..\n#..#.\n#...#",
  V: "#...#\n#...#\n#...#\n#...#\n#...#\n.#.#.\n..#..",
  0: ".###.\n#...#\n#..##\n#.#.#\n##..#\n#...#\n.###.",
  1: "..#..\n.##..\n..#..\n..#..\n..#..\n..#..\n.###.",
  "/": "....#\n....#\n...#.\n..#..\n.#...\n#....\n#....",
  "%": "##..#\n##.#.\n...#.\n..#..\n.#...\n.#.##\n#..##",
  $: "..#..\n.####\n#.#..\n.###.\n..#.#\n####.\n..#..",
};

// Sets one uppercase string. Advance is 6 units per glyph (5 wide + 1
// letterspace); a space is 4. Returned w trims the trailing letterspace.
export function word(text, fill) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    if (ch === " ") { x += 4; continue; }
    if (!FONT[ch]) {
      throw new Error(`pixelfont: no glyph for ${JSON.stringify(ch)} in ${JSON.stringify(text)}. Add its map to FONT in scripts/lib/pixelfont.mjs.`);
    }
    const { svg, w } = glyphRects(FONT[ch], fill);
    parts.push(`<g transform="translate(${x},0)">${svg}</g>`);
    x += w + 1;
  }
  return { svg: parts.join(""), w: x - 1, h: 7 };
}
