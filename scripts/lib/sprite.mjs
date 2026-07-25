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

// Look: the gaze shifts. Each eye's cream sparkle moves from the right cell
// of the 2x2 eye to the left cell - three pixels, row 3 only. Paired with
// rest at a slow dwell it reads as scanning for something off-screen, which
// is what a "waiting to connect" surface needs.
export const OVERSEER_LOOK = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aackaackaackaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

// Arms up: BOTH 2x2 arm nubs lifted one row (rows 5-6 -> 4-5), the wave's
// exact mechanic mirrored onto the left nub. Differs from OVERSEER in rows 4
// and 6. Neither hand goes above the lower eye line, so this stays inside the
// 2026-07-13 arm-height decision rather than reopening it. Drives the double
// arm wave (both arms together); the alternating variant swings the wave /
// wave-left mirror pair instead, and never uses this frame.
export const OVERSEER_ARMS_UP = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
aaaakkaakkaakkaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

// Wave-left: the mirror of OVERSEER_WAVE (viewer-LEFT nub lifted). Swinging
// wave <> wave-left is the double arm ALTERNATING wave; both nubs up at once
// (arms-up) is the double arm wave. Same two arms, two different readings:
// alternating reads playful, together reads urgent.
export const OVERSEER_WAVE_LEFT = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
aaaakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
`;

// Step frames: a foot lifts by shortening one leg, row 11 only. Legs cannot
// extend below row 11 (it is the last row of the grid), so lifting is the
// only move available. A<>B is a tripod bounce: the middle foot lifts, then
// the outer two. An alternating outer-foot march (STEP_L <> STEP_R, middle
// foot planted) was drafted and rejected at the live review, 2026-07-25 - with
// three legs and a planted centre it does not map to any gait a viewer can
// read. Do not re-add it without new information.
export const OVERSEER_STEP_A = `
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
....aa......aa....
`;

export const OVERSEER_STEP_B = `
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
........aa........
`;

// Compound frames: running legs WITH a shifted gaze. Only one frame is ever
// visible, so a sequence where the legs never stop needs the legs baked into
// every frame it uses - the leg rows and the eye row are disjoint (11 vs 3),
// so combining them is mechanically free. The cost is frame COUNT: legs (2) x
// upper body (rest / look / wave / wave-left) is 8 frames, and the motion
// budget caps a sequence at 4. Permanent running therefore carries exactly one
// other behaviour. These two are the running + gaze pair.
export const OVERSEER_STEP_A_LOOK = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aackaackaackaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa......aa....
`;

export const OVERSEER_STEP_B_LOOK = `
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aackaackaackaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
........aa........
`;

// ---------------------------------------------------------------------------
// Named animation sequences: the ONE declaration of what plays and when.
//
// Consumers used to hand-copy these timings and they drifted three ways (the
// website, the mobile app and this repo's own preview each had different
// blink numbers). gen-sprites.mjs generates assets/mascot/animations.json
// (data, for any runtime) and assets/mascot/animations.css (a drop-in stepped
// frame swap, for any Chromium/WebKit surface) from this object, so there is
// one source again.
//
//   clip    ordered [frame, durationMs] steps. Exactly ONE frame is visible
//           at a time - never rely on a pose overlaying the rest frame, since
//           poses that vacate a pixel let the rest frame bleed through.
//   loop    whether the sequence repeats.
//   idle    optional resting gap for a looping sequence: the frame to rest on
//           and the range to draw the gap from. bias "square" means
//           min + (max - min) * rand^2 - the right-skew that makes blinks
//           cluster short with the odd long pause instead of ticking like a
//           metronome. Generators cannot randomize (determinism gate), so the
//           range ships static and the CONSUMER draws from it; CSS, which
//           cannot randomize either, runs at the distribution mean.
//   repeat  optional chance of replaying the clip after a short gap.
//   draft   the sequence references pose frames not yet promoted to
//           assets/mascot/. It renders in the exploration demo page but stays
//           out of the shipped manifest and CSS.
//   compare a draft that exists only to be judged against the canonical one
//           on the demo page (a superseded cadence, or an alternate reading).
//
// Motion budget (design-language): <= 4 distinct frames per sequence, stepped,
// never tweened. prefers-reduced-motion rests on the canonical frame.
// ---------------------------------------------------------------------------
export const SEQUENCES = {
  none: {
    label: "no animation",
    note: "the default, and the reduced-motion rendering",
    loop: false,
    clip: [],
  },

  "blink-loop": {
    label: "blinking",
    note: "idle life. The human-blink model: gaps clustered short with the odd long pause rather than a flat spread, and an occasional double blink. The rate that falls out of the range is shown on the card, so it cannot go stale when the range is tuned",
    loop: true,
    idle: { frame: "rest", minMs: 2000, maxMs: 7000, bias: "square" },
    clip: [{ frame: "blink", durationMs: 140 }],
    repeat: { chance: 0.3, gapMinMs: 270, gapMaxMs: 400 },
  },

  "wave-once": {
    label: "single arm wave",
    note: "a greeting, or the payoff when a connection lands. One arm, five steps. The key stays `wave-once` because kangentic-mobile's animation union already uses that string",
    loop: false,
    clip: [
      { frame: "rest", durationMs: 120 },
      { frame: "wave", durationMs: 120 },
      { frame: "rest", durationMs: 120 },
      { frame: "wave", durationMs: 120 },
      { frame: "rest", durationMs: 120 },
    ],
  },

  // --- candidates: waiting-state vocabulary, not yet promoted ---------------

  "double-arm-wave-once": {
    label: "double arm wave",
    note: "both arms up together: he is trying to get your attention. The urgent one - it says 'over here', not 'hello'. Same 120ms step rate as the single arm wave, because it is the same mechanic on the same body part",
    loop: false,
    clip: [
      { frame: "rest", durationMs: 120 },
      { frame: "arms-up", durationMs: 120 },
      { frame: "rest", durationMs: 120 },
      { frame: "arms-up", durationMs: 120 },
      { frame: "rest", durationMs: 120 },
    ],
  },

  "double-arm-alternating-wave-once": {
    label: "double arm alternating wave",
    note: "arms pump alternately rather than together, which reads as playful where the double arm wave reads as urgent. Kept as its own sequence, not an alternate: the two say different things",
    loop: false,
    clip: [
      { frame: "rest", durationMs: 120 },
      { frame: "wave", durationMs: 120 },
      { frame: "wave-left", durationMs: 120 },
      { frame: "wave", durationMs: 120 },
      { frame: "rest", durationMs: 120 },
    ],
  },

  "looking-left-and-right-loop": {
    label: "looking left and right",
    note: "the gaze shifts side to side, looking for something that has not arrived yet. The base waiting idle. Deliberately long dwells - a wait screen loops indefinitely, so this has to read as calm, not as a twitch",
    loop: true,
    clip: [
      { frame: "rest", durationMs: 900 },
      { frame: "look", durationMs: 900 },
    ],
  },

  "running-loop": {
    label: "running",
    note: "legs cycling on the spot, which reads as running. Middle foot up, then the outer two. Chosen over an alternating outer-foot march at the 2026-07-25 review - with three legs and a planted centre, a march reads as nothing recognisable",
    loop: true,
    clip: [
      { frame: "step-a", durationMs: 400 },
      { frame: "step-b", durationMs: 400 },
    ],
  },

  "waiting-loop": {
    label: "waiting",
    note: "the legs never stop - he runs on the spot the whole time, glancing left and right as he goes. Permanent running means the legs are baked into every frame, so at the 4-frame motion budget this carries running plus ONE other behaviour; the gaze won it over the arms. Fire a wave sequence separately if the wait needs a bigger signal",
    loop: true,
    clip: [
      { frame: "step-a", durationMs: 400 },
      { frame: "step-b", durationMs: 400 },
      { frame: "step-a", durationMs: 400 },
      { frame: "step-b", durationMs: 400 },
      { frame: "step-a-look", durationMs: 400 },
      { frame: "step-b-look", durationMs: 400 },
      { frame: "step-a-look", durationMs: 400 },
      { frame: "step-b-look", durationMs: 400 },
    ],
  },

};

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
