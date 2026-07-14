// gen-sprites.mjs - the mascot sprite generator. Writes the CANONICAL
// Overseer to assets/mascot/ (what consumers embed) and every alternate /
// retired pose to exploration/mascot/ (reference, not shipped). All
// geometry rules live in scripts/lib/sprite.mjs.
//
// Usage: npm run gen:sprites
// Output: assets/mascot/overseer.svg (+ .png preview in exploration),
//         exploration/mascot/<name>.svg + .png (16x, crisp) for the rest.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MINION, MINION_RUN, OVERSEER, OVERSEER_BLINK, OVERSEER_UFO, OVERSEER_WAVE, UFO, buildSvg, parseMap } from "./lib/sprite.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MASCOT = join(ROOT, "assets", "mascot");
const EXPLORE = join(ROOT, "exploration", "mascot");

// --- Alternates and retired poses (kept for reference / future pivots) ------
// The kangaroo the system started from (16x16). Rows 0-9 are shared; only
// the legs/tail move so the hop reads as motion, not a different animal.
const HEAD_BODY = `.........rr..rr.
.........rr..rr.
.........rrrrrr.
.........rrrkrr.
.........rrrrrrr
........rrrrrr..
.......rrrrrrr..
......rrrrrrrr..
.....rrrrrrrcr..
....rrrrrrrrcr..`;
const rest = `${HEAD_BODY}
...rrrrrrrrrrr..
..rrrrrrrrrrrr..
.rrrrrrrrrrrrr..
rrrr..rrrrrrrr..
.rr....rrr..rr..
.......rr....rr.`;
const hop1 = `${HEAD_BODY}
...rrrrrrrrrrr..
..rrrrrrrrrrrr..
.rrrrrrrrrrrrr..
rrr..rrrrrrrrr..
......rrrrr.rr..
........rrr.....`;
const hop2 = `${HEAD_BODY}
...rrrrrrrrrrr..
.rrrrrrrrrrrrr..
rrrrrrrrrrrrrr..
...rrrrrrrrrr...
....rrr..rrr....
................`;

// The rust-bodied Overseer (rejected: one shade from Claude Code's icon).
const overseerRust = `
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

// The board creature (landscape, 20x14): the kanban board come alive -
// antenna, sparkle eyes on the bezel, three column slots with one amber
// card working through the middle, feet. A strong runner-up.
const boardRest = `
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

const ALTERNATES = {
  "kangaroo-rest": { map: rest, label: "Pixel-art kangaroo mascot (retired)" },
  "kangaroo-hop1": { map: hop1, label: "Pixel-art kangaroo mascot (retired)" },
  "kangaroo-hop2": { map: hop2, label: "Pixel-art kangaroo mascot (retired)" },
  "overseer-rust": { map: overseerRust, label: "Pixel-art Kangentic mascot (rust, rejected)" },
  "board-creature": { map: boardRest, label: "Pixel-art Kangentic board creature (runner-up)" },
};

await mkdir(MASCOT, { recursive: true });
await mkdir(EXPLORE, { recursive: true });

// Canonical mascot -> assets/mascot/overseer.svg, preview in exploration.
const LABEL = "Pixel-art Kangentic mascot";
const MINION_LABEL = "Pixel-art Kangentic agent minion";
const UFO_FULL_LABEL = "Pixel-art UFO carrying the Kangentic mascot";
const UFO_EMPTY_LABEL = "Pixel-art empty UFO";
const overseerSvg = buildSvg(OVERSEER, { unit: 1, label: LABEL });
await writeFile(join(MASCOT, "overseer.svg"), overseerSvg + "\n");
await sharp(Buffer.from(buildSvg(OVERSEER, { unit: 16, label: LABEL })))
  .png().toFile(join(EXPLORE, "overseer.png"));

// The composite's rider must stay byte-faithful to the canonical Overseer
// (rows 0-4, centered with 4 transparent columns each side, two rows
// below the bubble apex), so the rider is the mascot, not a lookalike.
function assertDome() {
  const ov = parseMap(OVERSEER);
  const comp = parseMap(OVERSEER_UFO);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 18; x++) {
      const ch = ov[y][x];
      if (ch !== "." && comp[y + 2][x + 4] !== ch) throw new Error(`overseer-ufo: rider pixel drifted at canonical row ${y}, col ${x}`);
    }
  }
}
assertDome();

// The fly-in overture bases -> assets/mascot/ (the UFO composite and the
// minion; their variation frames live in POSES below).
const CANON = {
  "overseer-ufo": { map: OVERSEER_UFO, label: UFO_FULL_LABEL },
  "minion": { map: MINION, label: MINION_LABEL },
};
for (const [name, { map, label }] of Object.entries(CANON)) {
  await writeFile(join(MASCOT, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

// Animation pose frames -> assets/mascot/. Consumers sequence them as a
// stepped frame swap (see the animation preview below); reduced motion
// rests on the canonical frame. Every pose is a variation of ONE base
// map: same grid, and every row it does not animate stays byte-identical
// to the base so motion reads as motion, not a different creature (and
// the empty saucer stays the composite's saucer). assertPose enforces it.
const POSES = {
  "overseer-blink": { base: OVERSEER, map: OVERSEER_BLINK, changedRows: [3], label: LABEL },
  "overseer-wave": { base: OVERSEER, map: OVERSEER_WAVE, changedRows: [4, 6], label: LABEL },
  "minion-run": { base: MINION, map: MINION_RUN, changedRows: [6], label: MINION_LABEL },
  "ufo": { base: OVERSEER_UFO, map: UFO, changedRows: [2, 3, 4, 5, 6], label: UFO_EMPTY_LABEL },
};

function assertPose(name, baseMap, map, changedRows) {
  const base = parseMap(baseMap);
  const pose = parseMap(map);
  if (pose.length !== base.length) throw new Error(`${name}: ${pose.length} rows (base has ${base.length})`);
  for (let y = 0; y < base.length; y++) {
    const row = pose[y].join("");
    const canon = base[y].join("");
    if (row.length !== canon.length) throw new Error(`${name}: row ${y} is ${row.length} wide (base is ${canon.length})`);
    if (!changedRows.includes(y) && row !== canon) throw new Error(`${name}: row ${y} drifted from the base map`);
  }
}

for (const [name, { base, map, changedRows, label }] of Object.entries(POSES)) {
  assertPose(name, base, map, changedRows);
  await writeFile(join(MASCOT, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

// Animation preview -> exploration/mascot/ (review artifact + the
// reference recipe for the consumer-side sequencing).
const FRAMES = {
  rest: buildSvg(OVERSEER, { unit: 1, label: LABEL }),
  blink: buildSvg(OVERSEER_BLINK, { unit: 1, label: LABEL }),
  wave: buildSvg(OVERSEER_WAVE, { unit: 1, label: LABEL }),
  ufoFull: buildSvg(OVERSEER_UFO, { unit: 1, label: UFO_FULL_LABEL }),
  ufoEmpty: buildSvg(UFO, { unit: 1, label: UFO_EMPTY_LABEL }),
  minion: buildSvg(MINION, { unit: 1, label: MINION_LABEL }),
  minionRun: buildSvg(MINION_RUN, { unit: 1, label: MINION_LABEL }),
};

// The fly-in scene: the consumer contract for the once-per-visitor load
// overture. Display unit is 10px per grid unit (the strip below shows the
// same scale); ALL translation is stepped in whole grid-unit hops.
//
// Anti-grid scatter for the 11 minions (one per agent CLI in the proof
// line): irregular spawn gaps, interleaved directions (6 right, 5 left),
// short varied hatch drops, then a shallow DESCENDING run ray (mostly
// horizontal: one unit down per hop, 2-5 units across, at varied angles
// and speeds) until fully off the stage, past a side edge or below the
// bottom. Two constraints keep the crowd readable: the run starts two
// hops into the drop (minions leap out instead of stacking at the
// hatch), and within each direction later spawns run slower, so early
// runners pull away and nobody overtakes mid-stage. The crowd must never
// read as an invader formation. All literals, fully deterministic.
// Columns: [spawn s, dir (+1 right / -1 left), hatch x-offset px, drop px, run dx u/hop, run dy u/hop, run hops, ms per hop]
const MINIONS = [
  [4.0, 1, 0, 40, 3, 1, 18, 90],
  [4.3, -1, -10, 60, 2, 1, 18, 90],
  [4.5, 1, 10, 50, 4, 1, 13, 100],
  [4.9, 1, 0, 60, 2, 1, 18, 110],
  [5.2, -1, -20, 40, 3, 1, 17, 100],
  [5.3, 1, 20, 50, 3, 1, 17, 120],
  [5.7, -1, 0, 60, 4, 1, 13, 110],
  [6.0, -1, 10, 40, 3, 1, 18, 120],
  [6.2, 1, -10, 50, 4, 1, 14, 120],
  [6.6, -1, 20, 60, 2, 1, 18, 130],
  [6.9, 1, 0, 40, 5, 1, 11, 110],
];
// Drops hop 1 unit per 60ms step; runs hop (dx, dy) units per step. Every
// end position is fully off the 960x340 stage so `both` fill never parks
// a sliver on screen; the generator refuses a ray that parks on stage.
// toFixed keeps the generated CSS byte-stable.
const minionCss = MINIONS.map(([spawn, dir, xoff, drop, dxu, dyu, hops, stepMs], i) => {
  const n = i + 1;
  const dropSteps = drop / 10;
  // A fractional steps() count is invalid CSS the browser drops silently.
  if (!Number.isInteger(dropSteps) || xoff % 10 !== 0) {
    throw new Error(`minion ${n}: drop/x-offset must be whole grid-unit hops`);
  }
  const startX = 430 + xoff;
  const runX = dir * hops * dxu * 10;
  const runY = hops * dyu * 10;
  const endX = startX + runX;
  const endY = 100 + drop + runY;
  if (endX > -80 && endX < 960 && endY < 340) {
    throw new Error(`minion ${n}: run parks on stage at ${endX},${endY} (must exit fully)`);
  }
  const dropDur = (dropSteps * 0.06).toFixed(2);
  const runDur = ((hops * stepMs) / 1000).toFixed(2);
  const runDelay = (spawn + 0.12).toFixed(2);
  const at = spawn.toFixed(2);
  return `  .m${n} { left: ${startX}px; }
  .m${n} .drop { animation: m${n}-drop ${dropDur}s steps(${dropSteps}, end) ${at}s both; }
  @keyframes m${n}-drop { to { transform: translateY(${drop}px); } }
  .m${n} .run { animation: m${n}-run ${runDur}s steps(${hops}, end) ${runDelay}s both; }
  @keyframes m${n}-run { to { transform: translate(${runX}px, ${runY}px); } }
  .m${n} .f-a { animation: m-appear 0s step-end ${at}s forwards, run-a 0.24s step-end ${runDelay}s infinite; }
  .m${n} .f-b { animation: run-b 0.24s step-end ${runDelay}s infinite; }`;
}).join("\n");
const minionHtml = MINIONS.map((_, i) =>
  `  <div class="minion m${i + 1}"><div class="drop"><div class="run"><div class="f f-a">${FRAMES.minion}</div><div class="f f-b">${FRAMES.minionRun}</div></div></div></div>`
).join("\n");
const previewHtml = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Overseer animation preview</title>
<style>
  /* generated by scripts/gen-sprites.mjs - do not hand-edit */
  body { margin: 0; padding: 48px; background: #fdfbf7; color: #24201b; font: 14px/1.5 ui-monospace, Consolas, monospace; }
  h1 { font-size: 18px; margin: 32px 0 8px; }
  p { max-width: 62ch; color: #6e6659; }
  .row { display: flex; gap: 48px; flex-wrap: wrap; margin: 24px 0; }
  figure { margin: 0; }
  figcaption { margin-top: 8px; font-size: 12px; color: #6e6659; }
  .sprite { width: 180px; height: 120px; }
  .sprite svg { width: 100%; height: 100%; }
  .sprite-ufo { width: 260px; height: 110px; }
  .sprite-minion { width: 80px; height: 70px; }
  .sprite-ufo svg, .sprite-minion svg { width: 100%; height: 100%; }
  .demo { position: relative; width: 180px; height: 120px; }
  .demo .f { position: absolute; inset: 0; visibility: hidden; }
  .demo .f svg { width: 100%; height: 100%; }
  .demo .f-rest { visibility: visible; }

  /* Blink: idle loop, eyes closed for 120ms every 5s. */
  .blink .f-rest { animation: blink-rest 5s step-end infinite; }
  .blink .f-eyes { animation: blink-eyes 5s step-end infinite; }
  @keyframes blink-rest { 0% { visibility: visible; } 97.6% { visibility: hidden; } }
  @keyframes blink-eyes { 0% { visibility: hidden; } 97.6% { visibility: visible; } }

  /* Wave: a 2-pose toggle. One-shot on load (rest > wave > rest > wave
     > rest, 120ms per step), then a paced loop while hovered. Stepped
     frame swap only; pixels hop, they do not glide. */
  .wave .f-rest { animation: wave-rest 0.6s step-end 1; }
  .wave .f-hand { animation: wave-hand 0.6s step-end 1; }
  @keyframes wave-rest { 0% { visibility: visible; } 20% { visibility: hidden; } 40% { visibility: visible; } 60% { visibility: hidden; } 80% { visibility: visible; } }
  @keyframes wave-hand { 0% { visibility: hidden; } 20% { visibility: visible; } 40% { visibility: hidden; } 60% { visibility: visible; } 80% { visibility: hidden; } }
  .wave:hover .f-rest { animation: wave-loop-rest 2s step-end infinite; }
  .wave:hover .f-hand { animation: wave-loop-hand 2s step-end infinite; }
  @keyframes wave-loop-rest { 0% { visibility: visible; } 6% { visibility: hidden; } 12% { visibility: visible; } 18% { visibility: hidden; } 24% { visibility: visible; } }
  @keyframes wave-loop-hand { 0% { visibility: hidden; } 6% { visibility: visible; } 12% { visibility: hidden; } 18% { visibility: visible; } 24% { visibility: hidden; } }

  /* Fly-in overture: stepped translation ONLY (steps() in whole grid-unit
     hops at 10px per grid unit); frame swaps stay in the 120ms family.
     The nested UFO wrappers compose the entry, the hover bob, and the
     departure without two animations fighting over one transform. The
     entry is a stepped ZIGZAG swoop (down from the upper left, up, a
     short dip, then a long shallow climb to the hover); every segment
     keeps whole grid-unit hops at 120ms via a per-keyframe steps()
     timing function. The departure climbs out at the mirror angle. */
  .scene { position: relative; width: 960px; height: 340px; overflow: hidden; background: #f6f1e8; border: 1px solid rgba(36,32,27,0.16); }
  .scene svg { width: 100%; height: 100%; }
  .ufo { position: absolute; left: 0; top: 0; width: 260px; height: 110px; z-index: 3; }
  .ufo-go, .ufo-x, .ufo-bob { position: absolute; inset: 0; }
  .ufo .f { position: absolute; inset: 0; }
  .ufo-go { animation: ufo-depart 1.2s steps(10, end) 9.6s both; }
  .ufo-x { animation: ufo-enter 3.6s both; }
  .ufo-bob { animation: bob 0.96s step-end 3.6s 5; }
  /* 30 hops at 120ms: 10 down (2u,3u), 7 up (2u,-2u), 3 down (2u,2u),
     10 up (2u,-1u). Keyframe offsets are cumulative hops / 30. */
  @keyframes ufo-enter {
    0% { transform: translate(-260px, -110px); animation-timing-function: steps(10, end); }
    33.3333% { transform: translate(-60px, 190px); animation-timing-function: steps(7, end); }
    56.6667% { transform: translate(80px, 50px); animation-timing-function: steps(3, end); }
    66.6667% { transform: translate(140px, 110px); animation-timing-function: steps(10, end); }
    100% { transform: translate(340px, 10px); }
  }
  @keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes ufo-depart { to { transform: translate(700px, -100px); } }

  /* Scheduled frame swaps and spawns: 0s step-end visibility flips. */
  @keyframes m-appear { to { visibility: visible; } }
  @keyframes m-vanish { to { visibility: hidden; } }
  .ufo .f-full { animation: m-vanish 0s step-end 8.4s forwards; }
  .ufo .f-empty { visibility: hidden; animation: m-appear 0s step-end 8.4s forwards; }

  /* The Overseer hops down through the hatch at 8.4s (pixels hop: the
     swap from dome to below-hull IS the disembark), steps to its rest
     slot, then the blink idle takes over at 11.2s. */
  .hero { position: absolute; left: 380px; top: 120px; width: 180px; height: 120px; z-index: 2; }
  .hero .land { position: absolute; inset: 0; animation: hero-drop 0.84s steps(7, end) 8.4s both; }
  @keyframes hero-drop { to { transform: translateY(70px); } }
  .hero .f { position: absolute; inset: 0; visibility: hidden; }
  .hero .f-rest { animation: m-appear 0s step-end 8.4s forwards, blink-rest 5s step-end 11.2s infinite; }
  .hero .f-eyes { animation: blink-eyes 5s step-end 11.2s infinite; }

  /* Minions: frames gate their OWN visibility (a child's visibility:
     visible overrides a hidden ancestor, so hiding only a wrapper would
     leak). Drop hops 1 unit per 60ms step; run hops 2 units per step
     with the 240ms 2-pose foot toggle. */
  .minion { position: absolute; top: 100px; width: 80px; height: 70px; z-index: 1; }
  .minion .drop, .minion .run { position: absolute; inset: 0; }
  .minion .f { position: absolute; inset: 0; visibility: hidden; }
  @keyframes run-a { 0% { visibility: visible; } 50% { visibility: hidden; } }
  @keyframes run-b { 0% { visibility: hidden; } 50% { visibility: visible; } }
${minionCss}

  /* Reduced motion is a first-class rendering: rest on the canonical
     frame; the overture renders ONLY the resting Overseer (no UFO, no
     minions, no motion). */
  @media (prefers-reduced-motion: reduce) {
    .demo .f { animation: none !important; }
    .scene .ufo, .scene .minion { display: none; }
    .scene .hero .land { animation: none; transform: translateY(70px); }
    .scene .hero .f-rest { animation: none; visibility: visible; }
    .scene .hero .f-eyes { animation: none; visibility: hidden; }
  }
</style>
<h1>Overseer animation preview</h1>
<p>Review artifact generated by scripts/gen-sprites.mjs. Consumers
sequence the shipped frames in assets/mascot/ exactly like this: a
stepped frame swap between 2-4 poses, never a tween. Under
prefers-reduced-motion the mascot rests on the canonical frame. One
mascot per page (the fly-in overture below is the one sanctioned
exception); the mascot's alt text stays "${LABEL}".</p>

<h1>Fly-in overture (the consumer contract)</h1>
<p>The once-per-visitor load sequence: the UFO swoops in from the upper
left on a stepped zigzag (down, up, a short dip, then a long shallow
climb to the hover; it climbs out at the mirror angle), hovers, and
hatches 11 minions (one per agent CLI) at scattered times that scatter
off the stage on shallow descending runs, mostly horizontal, at varied
angles and speeds, never a formation. The Overseer hops down through
the hatch, steps to its resting slot, the empty saucer departs, and the
blink idle starts only after settle. On kangentic.com this runs once per
visitor (sessionStorage gate) in an absolutely positioned overlay with
pointer-events none, aria-hidden UFO and minions, and zero layout shift;
the resting Overseer keeps its normal placement and alt text. Every
sprite shares one integer display unit (here 10px per grid unit). Under
prefers-reduced-motion only the resting Overseer renders. Reload to
replay.</p>

<figure>
  <div class="scene">
    <div class="ufo"><div class="ufo-go"><div class="ufo-x"><div class="ufo-bob">
      <div class="f f-full">${FRAMES.ufoFull}</div>
      <div class="f f-empty">${FRAMES.ufoEmpty}</div>
    </div></div></div></div>
${minionHtml}
    <div class="hero"><div class="land">
      <div class="f f-rest">${FRAMES.rest}</div>
      <div class="f f-eyes">${FRAMES.blink}</div>
    </div></div>
  </div>
  <figcaption>fly-in overture: enter, hatch 11 minions, disembark, depart; reload to replay</figcaption>
</figure>

<div class="row">
  <figure>
    <div class="demo blink">
      <div class="f f-rest">${FRAMES.rest}</div>
      <div class="f f-eyes">${FRAMES.blink}</div>
    </div>
    <figcaption>blink: idle loop, closed ~120ms every 5s</figcaption>
  </figure>
  <figure>
    <div class="demo wave">
      <div class="f f-rest">${FRAMES.rest}</div>
      <div class="f f-hand">${FRAMES.wave}</div>
    </div>
    <figcaption>wave: one-shot on load; hover to wave again</figcaption>
  </figure>
</div>

<h1>Frames (10x)</h1>
<div class="row">
  <figure><div class="sprite">${FRAMES.rest}</div><figcaption>overseer.svg (rest)</figcaption></figure>
  <figure><div class="sprite">${FRAMES.blink}</div><figcaption>overseer-blink.svg</figcaption></figure>
  <figure><div class="sprite">${FRAMES.wave}</div><figcaption>overseer-wave.svg</figcaption></figure>
  <figure><div class="sprite-ufo">${FRAMES.ufoFull}</div><figcaption>overseer-ufo.svg</figcaption></figure>
  <figure><div class="sprite-ufo">${FRAMES.ufoEmpty}</div><figcaption>ufo.svg</figcaption></figure>
  <figure><div class="sprite-minion">${FRAMES.minion}</div><figcaption>minion.svg</figcaption></figure>
  <figure><div class="sprite-minion">${FRAMES.minionRun}</div><figcaption>minion-run.svg</figcaption></figure>
</div>
</html>
`;
await writeFile(join(EXPLORE, "animation-preview.html"), previewHtml);

// Alternates -> exploration/mascot only.
for (const [name, { map, label }] of Object.entries(ALTERNATES)) {
  await writeFile(join(EXPLORE, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

console.log(`Wrote assets/mascot/overseer.svg + ${Object.keys(CANON).length} overture bases + ${Object.keys(POSES).length} pose frames, the animation preview (incl. the fly-in scene), and ${Object.keys(ALTERNATES).length} alternates to exploration/mascot/`);
