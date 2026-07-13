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
import { OVERSEER, OVERSEER_BLINK, OVERSEER_WAVE, buildSvg, parseMap } from "./lib/sprite.mjs";

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
const overseerSvg = buildSvg(OVERSEER, { unit: 1, label: LABEL });
await writeFile(join(MASCOT, "overseer.svg"), overseerSvg + "\n");
await sharp(Buffer.from(buildSvg(OVERSEER, { unit: 16, label: LABEL })))
  .png().toFile(join(EXPLORE, "overseer.png"));

// Animation pose frames -> assets/mascot/. Consumers sequence them as a
// stepped frame swap (see the animation preview below); reduced motion
// rests on the canonical frame. Every pose is a variation of the ONE
// canonical map: same grid, and every row it does not animate stays
// byte-identical to OVERSEER so motion reads as motion, not a different
// creature. assertPose enforces that.
const POSES = {
  "overseer-blink": { map: OVERSEER_BLINK, changedRows: [3] },
  "overseer-wave": { map: OVERSEER_WAVE, changedRows: [4, 6] },
};

function assertPose(name, map, changedRows) {
  const base = parseMap(OVERSEER);
  const pose = parseMap(map);
  if (pose.length !== base.length) throw new Error(`${name}: ${pose.length} rows (canonical has ${base.length})`);
  for (let y = 0; y < base.length; y++) {
    const row = pose[y].join("");
    const canon = base[y].join("");
    if (row.length !== canon.length) throw new Error(`${name}: row ${y} is ${row.length} wide (canonical is ${canon.length})`);
    if (!changedRows.includes(y) && row !== canon) throw new Error(`${name}: row ${y} drifted from the canonical map`);
  }
}

for (const [name, { map, changedRows }] of Object.entries(POSES)) {
  assertPose(name, map, changedRows);
  await writeFile(join(MASCOT, `${name}.svg`), buildSvg(map, { unit: 1, label: LABEL }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label: LABEL }))).png().toFile(join(EXPLORE, `${name}.png`));
}

// Animation preview -> exploration/mascot/ (review artifact + the
// reference recipe for the consumer-side sequencing).
const FRAMES = {
  rest: buildSvg(OVERSEER, { unit: 1, label: LABEL }),
  blink: buildSvg(OVERSEER_BLINK, { unit: 1, label: LABEL }),
  wave: buildSvg(OVERSEER_WAVE, { unit: 1, label: LABEL }),
};
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

  /* Reduced motion is a first-class rendering: rest on the canonical frame. */
  @media (prefers-reduced-motion: reduce) {
    .demo .f { animation: none !important; }
  }
</style>
<h1>Overseer animation preview</h1>
<p>Review artifact generated by scripts/gen-sprites.mjs. Consumers
sequence the shipped frames in assets/mascot/ exactly like this: a
stepped frame swap between 2-4 poses, never a tween. Under
prefers-reduced-motion the mascot rests on the canonical frame. One
mascot per page; alt text stays "${LABEL}".</p>

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
</div>
</html>
`;
await writeFile(join(EXPLORE, "animation-preview.html"), previewHtml);

// Alternates -> exploration/mascot only.
for (const [name, { map, label }] of Object.entries(ALTERNATES)) {
  await writeFile(join(EXPLORE, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

console.log(`Wrote assets/mascot/overseer.svg + ${Object.keys(POSES).length} pose frames, the animation preview, and ${Object.keys(ALTERNATES).length} alternates to exploration/mascot/`);
