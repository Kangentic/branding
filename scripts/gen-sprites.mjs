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
import { OVERSEER, buildSvg } from "./lib/sprite.mjs";

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
const overseerSvg = buildSvg(OVERSEER, { unit: 1, label: "Pixel-art Kangentic mascot" });
await writeFile(join(MASCOT, "overseer.svg"), overseerSvg + "\n");
await sharp(Buffer.from(buildSvg(OVERSEER, { unit: 16, label: "Pixel-art Kangentic mascot" })))
  .png().toFile(join(EXPLORE, "overseer.png"));

// Alternates -> exploration/mascot only.
for (const [name, { map, label }] of Object.entries(ALTERNATES)) {
  await writeFile(join(EXPLORE, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

console.log(`Wrote assets/mascot/overseer.svg and ${Object.keys(ALTERNATES).length} alternates to exploration/mascot/`);
