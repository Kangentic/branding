// gen-sprites.mjs - the mascot sprite generator. Writes the CANONICAL
// Overseer to assets/mascot/ (what consumers embed) and every alternate /
// retired pose to exploration/mascot/ (reference, not shipped). All
// geometry rules live in scripts/lib/sprite.mjs.
//
// Usage: npm run gen:sprites
// Output: assets/mascot/overseer.svg (+ .png preview in exploration),
//         exploration/mascot/<name>.svg + .png (16x, crisp) for the rest.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  OVERSEER,
  OVERSEER_BLINK,
  OVERSEER_WAVE,
  OVERSEER_LOOK,
  OVERSEER_ARMS_UP,
  OVERSEER_WAVE_LEFT,
  OVERSEER_STEP_A,
  OVERSEER_STEP_B,
  OVERSEER_STEP_A_LOOK,
  OVERSEER_STEP_B_LOOK,
  SEQUENCES,
  buildSvg,
  parseMap,
  rects,
} from "./lib/sprite.mjs";

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

// Animation pose frames. Every pose is a variation of the ONE canonical map:
// same grid, and every row it does not animate stays byte-identical to
// OVERSEER so motion reads as motion, not a different creature. assertPose
// enforces that in both directions. Sequencing lives in SEQUENCES (lib) and
// ships as animations.json / animations.css below.
//
// `draft: true` = a candidate under review. It renders to exploration/mascot/
// only, so assets/ stays honest until the pose is signed off; promoting is
// deleting the flag.
const FRAMES = {
  rest: { map: OVERSEER, changedRows: [], file: "overseer.svg" },
  blink: { map: OVERSEER_BLINK, changedRows: [3], file: "overseer-blink.svg" },
  wave: { map: OVERSEER_WAVE, changedRows: [4, 6], file: "overseer-wave.svg" },
  look: { map: OVERSEER_LOOK, changedRows: [3], file: "overseer-look.svg" },
  "arms-up": { map: OVERSEER_ARMS_UP, changedRows: [4, 6], file: "overseer-arms-up.svg" },
  "wave-left": { map: OVERSEER_WAVE_LEFT, changedRows: [4, 6], file: "overseer-wave-left.svg" },
  "step-a": { map: OVERSEER_STEP_A, changedRows: [11], file: "overseer-step-a.svg" },
  "step-b": { map: OVERSEER_STEP_B, changedRows: [11], file: "overseer-step-b.svg" },
  "step-a-look": { map: OVERSEER_STEP_A_LOOK, changedRows: [3, 11], file: "overseer-step-a-look.svg" },
  "step-b-look": { map: OVERSEER_STEP_B_LOOK, changedRows: [3, 11], file: "overseer-step-b-look.svg" },
};

const BASE_GRID = parseMap(OVERSEER);
const GRID = { columns: BASE_GRID[0].length, rows: BASE_GRID.length };

function assertPose(name, map, changedRows) {
  const pose = parseMap(map);
  if (pose.length !== BASE_GRID.length)
    throw new Error(`${name}: ${pose.length} rows (canonical has ${BASE_GRID.length})`);
  for (let y = 0; y < BASE_GRID.length; y++) {
    const row = pose[y].join("");
    const canon = BASE_GRID[y].join("");
    if (row.length !== canon.length)
      throw new Error(`${name}: row ${y} is ${row.length} wide (canonical is ${canon.length})`);
    const declared = changedRows.includes(y);
    if (!declared && row !== canon) throw new Error(`${name}: row ${y} drifted from the canonical map`);
    // The inverse matters just as much: a row declared as animated that did
    // NOT change is a drafting slip (a copy-paste, or an edit that landed on
    // the wrong row). Unguarded it ships as a loop where nothing moves.
    if (declared && row === canon)
      throw new Error(`${name}: row ${y} is declared in changedRows but is identical to the canonical map`);
  }
}

// Does this pose fully cover the rest frame, or does it VACATE a pixel? A
// pose that vacates (the wave's arm leaves row 6, a step's foot leaves row 11)
// lets the rest frame bleed through if a consumer stacks them and only toggles
// the pose. Recorded in the manifest so nobody has to rediscover it; the
// generated CSS sidesteps it entirely by keeping exactly one frame visible.
function compositingOf(key, map) {
  if (key === "rest") return "base";
  const pose = parseMap(map);
  for (let y = 0; y < BASE_GRID.length; y++) {
    for (let x = 0; x < BASE_GRID[y].length; x++) {
      if (BASE_GRID[y][x] !== "." && (pose[y]?.[x] ?? ".") === ".") return "exclusive";
    }
  }
  return "overlay";
}

for (const [key, frame] of Object.entries(FRAMES)) {
  if (key !== "rest") assertPose(key, frame.map, frame.changedRows);
  frame.compositing = compositingOf(key, frame.map);
  const svg = buildSvg(frame.map, { unit: 1, label: LABEL }) + "\n";
  if (!frame.draft && key !== "rest") await writeFile(join(MASCOT, frame.file), svg);
  if (frame.draft) await writeFile(join(EXPLORE, frame.file), svg);
  if (key !== "rest")
    await sharp(Buffer.from(buildSvg(frame.map, { unit: 16, label: LABEL })))
      .png()
      .toFile(join(EXPLORE, frame.file.replace(/\.svg$/, ".png")));
}

// ---------------------------------------------------------------------------
// The shared animation contract -> assets/mascot/.
//
//   animations.json  framework-agnostic data, for any runtime (including
//                    React Native, where CSS does not exist).
//   animations.css   a drop-in stepped frame swap for any Chromium/WebKit
//                    surface (the website, the Electron desktop app).
//
// Both are generated from SEQUENCES in lib/sprite.mjs, so the timings have ONE
// home instead of being hand-copied into each consumer and drifting apart.
// ---------------------------------------------------------------------------

// A "square" bias means the consumer draws min + (max - min) * rand^2, whose
// mean is min + (max - min) / 3 - NOT the midpoint. CSS cannot randomize, so
// it runs at that mean, computed from the bias rather than by averaging ends.
const idleMeanMs = (idle) =>
  idle.bias === "square"
    ? Math.round(idle.minMs + (idle.maxMs - idle.minMs) / 3)
    : Math.round((idle.minMs + idle.maxMs) / 2);

// The full on-screen timeline: the resting gap (if any), then the clip.
const timelineOf = (seq) =>
  seq.idle ? [{ frame: seq.idle.frame, durationMs: idleMeanMs(seq.idle) }, ...seq.clip] : seq.clip;

const framesOf = (seq) => [...new Set(timelineOf(seq).map((s) => s.frame))];

// Motion budget (design-language): a sprite animation is a stepped swap
// between 2-4 poses. Checked here so an over-budget sequence cannot ship, and
// so a sequence can never reference a frame that is missing or still a draft.
for (const [name, seq] of Object.entries(SEQUENCES)) {
  const used = framesOf(seq);
  if (used.length > 4) throw new Error(`${name}: ${used.length} distinct frames (motion budget is 4)`);
  for (const f of used) if (!FRAMES[f]) throw new Error(`${name}: references unknown frame "${f}"`);
  if (!seq.draft && used.some((f) => FRAMES[f].draft))
    throw new Error(`${name}: a shipped sequence cannot reference the draft frame "${used.find((f) => FRAMES[f].draft)}"`);
}

const manifest = {
  $comment: "generated by scripts/gen-sprites.mjs - do not hand-edit",
  grid: GRID,
  label: LABEL,
  restFrame: "rest",
  frames: Object.fromEntries(
    Object.entries(FRAMES)
      .filter(([, f]) => !f.draft)
      .map(([k, f]) => [k, { file: f.file, compositing: f.compositing }]),
  ),
  sequences: Object.fromEntries(
    Object.entries(SEQUENCES)
      .filter(([, s]) => !s.draft)
      .map(([k, s]) => [
        k,
        {
          label: s.label,
          note: s.note,
          loop: !!s.loop,
          reducedMotion: "rest",
          ...(s.idle ? { idle: s.idle } : {}),
          clip: s.clip,
          ...(s.repeat ? { repeat: s.repeat } : {}),
        },
      ]),
  ),
};
await writeFile(join(MASCOT, "animations.json"), JSON.stringify(manifest, null, 2) + "\n");

const pct = (n) => `${Math.round(n * 10000) / 10000}%`;

// One keyframe track per frame, with exactly ONE frame visible at any instant.
// That is correct for `overlay` and `exclusive` poses alike, so a consumer
// using this file cannot hit the bleed-through trap.
//
// No animation-fill-mode anywhere, deliberately: the desktop app's
// "animations off" setting zeroes animation-duration, and a FILLED 0s
// animation snaps to its 100% keyframe. Instead every track carries an
// explicit terminal keyframe - back to the 0% state for a loop (seamless),
// back to the rest rendering for a one-shot (matching the base rule, so
// nothing snaps when it ends).
function track(seq, frame) {
  const steps = timelineOf(seq);
  const total = steps.reduce((a, s) => a + s.durationMs, 0);
  const stops = [];
  let t = 0;
  for (const s of steps) {
    stops.push({ at: (t / total) * 100, on: s.frame === frame });
    t += s.durationMs;
  }
  stops.push({ at: 100, on: seq.loop ? stops[0].on : frame === "rest" });
  const out = [];
  for (const s of stops) if (!out.length || out[out.length - 1].on !== s.on) out.push(s);
  if (out[out.length - 1].at !== 100) out.push({ at: 100, on: out[out.length - 1].on });
  return { total, stops: out };
}

function sequenceCss(name, seq) {
  if (!timelineOf(seq).length) return ""; // `none`: the base rule already rests on the canonical frame
  const lines = [`/* ${seq.label}: ${seq.note} */`];
  for (const f of [...new Set([...framesOf(seq), "rest"])]) {
    const { total, stops } = track(seq, f);
    const kf = stops.map((s) => `${pct(s.at)} { visibility: ${s.on ? "visible" : "hidden"}; }`).join(" ");
    lines.push(`@keyframes overseer-${name}--${f} { ${kf} }`);
    lines.push(
      `.overseer--${name} .overseer-frame--${f} { animation: overseer-${name}--${f} ${total}ms step-end ${seq.loop ? "infinite" : "1"}; }`,
    );
  }
  return lines.join("\n");
}

const REDUCED_MOTION_CSS = `/* Reduced motion is a rendering, not a mute button: fall back to the base
   composition above, which is the canonical frame. */
@media (prefers-reduced-motion: reduce) {
  .overseer .overseer-frame { animation: none !important; }
}`;

const cssFor = (entries) =>
  entries
    .map(([name, seq]) => sequenceCss(name, seq))
    .filter(Boolean)
    .join("\n\n");

const animationsCss = `/* Overseer animation sequences. Generated by scripts/gen-sprites.mjs from
   SEQUENCES in scripts/lib/sprite.mjs - do not hand-edit; regenerate with
   \`npm run gen:sprites\`.

   Stack one frame div per pose inside a container, give the container a width,
   and put the sequence class on it. The container carries the accessible name;
   the frames are aria-hidden so it reads as one image.

     <div class="overseer overseer--blink-loop" role="img"
          aria-label="${LABEL}" style="width: 90px">
       <div class="overseer-frame overseer-frame--rest"  aria-hidden="true"><svg .../></div>
       <div class="overseer-frame overseer-frame--blink" aria-hidden="true"><svg .../></div>
     </div>

   Only \`visibility\` animates, with step-end easing: pixels hop, they never
   glide, and no compositor layer is created to blur them. Exactly one frame is
   visible at any instant, so a pose that vacates a pixel cannot let the rest
   frame bleed through underneath.

   CSS cannot randomize, so a looping sequence runs at the mean of its idle
   range. A consumer with a scheduler should read animations.json instead and
   draw from \`idle\` (honouring \`repeat\`) for the human cadence. */

.overseer { position: relative; display: inline-block; aspect-ratio: ${GRID.columns} / ${GRID.rows}; }
.overseer-frame { position: absolute; inset: 0; visibility: hidden; }
.overseer-frame > svg { display: block; width: 100%; height: 100%; }
/* The resting composition IS the reduced-motion rendering: only the canonical
   frame shows, and every sequence returns here when it ends or is disabled. */
.overseer-frame--rest { visibility: visible; }

${cssFor(Object.entries(SEQUENCES).filter(([, s]) => !s.draft))}

${REDUCED_MOTION_CSS}
`;
await writeFile(join(MASCOT, "animations.css"), animationsCss);

const hasDrafts = Object.values(SEQUENCES).some((s) => s.draft);

// Candidate sequences render in the demo page only. They layer on top of the
// shipped animations.css (which owns the base rules), so promoting a pose is
// deleting a `draft` flag - the CSS moves file with no rewrite.
const candidatesCss = `/* Candidate Overseer sequences under review - generated by
   scripts/gen-sprites.mjs, exploration only, NOT shipped. Layers on top of
   assets/mascot/animations.css, which owns the base rules. */

${cssFor(Object.entries(SEQUENCES).filter(([, s]) => s.draft))}

${REDUCED_MOTION_CSS}
`;
// Only exists while something is under review. With every candidate promoted
// it would be an empty stylesheet that the demo page still requests, so it is
// removed instead of shipped hollow.
const candidatesPath = join(EXPLORE, "candidates.css");
if (hasDrafts) await writeFile(candidatesPath, candidatesCss);
else if (existsSync(candidatesPath)) await rm(candidatesPath);

// Emitter self-check: every frame a sequence touches, PLUS the rest frame it
// covers, must have a track in the stylesheet it landed in. Exactly one frame
// visible at a time is what makes a pixel-vacating pose safe. This runs over
// CANDIDATE sequences too, which matters because check-invariants reads the
// shipped manifest and therefore cannot see them - without this, a draft could
// only be gated at the moment it was promoted.
for (const [name, seq] of Object.entries(SEQUENCES)) {
  if (!timelineOf(seq).length) continue;
  const css = seq.draft ? candidatesCss : animationsCss;
  for (const f of new Set([...framesOf(seq), "rest"])) {
    if (!css.includes(`.overseer--${name} .overseer-frame--${f} {`)) {
      throw new Error(`${name}: emitted CSS has no track for frame "${f}" (rest would bleed through)`);
    }
  }
}

// ---------------------------------------------------------------------------
// The demo page -> exploration/mascot/animation-preview.html.
//
// It LINKS the generated CSS rather than restating it, so the demo and the
// shipped artifact are the same code and cannot drift.
//
// Presentation rule: every sequence appears EXACTLY ONCE. Size is a single
// page-wide control rather than a row of copies per card - rendering each loop
// at four sizes put ~48 mascots on the page and buried the two calls that
// actually need making. Settled material sits behind <details>.
// ---------------------------------------------------------------------------
const symbolDefs = Object.entries(FRAMES)
  .map(([k, f]) => {
    const r = rects(f.map, { unit: 1 });
    return `<symbol id="ovr-${k}" viewBox="0 0 ${r.w} ${r.h}">${r.svg}</symbol>`;
  })
  .join("");

const frameDiv = (k) =>
  `<div class="overseer-frame overseer-frame--${k}" aria-hidden="true"><svg viewBox="0 0 ${GRID.columns} ${GRID.rows}" shape-rendering="crispEdges"><use href="#ovr-${k}"/></svg></div>`;

const stack = (name, seq) =>
  `<div class="overseer overseer--${name}" data-loop="${seq.loop ? "true" : "false"}" role="img" aria-label="${LABEL}">` +
  [...new Set([...framesOf(seq), "rest"])].map(frameDiv).join("") +
  `</div>`;

function timingText(seq) {
  const parts = [];
  if (seq.idle) {
    // Derive the rate rather than restating it in prose: tuning the range
    // must not leave a hand-written "~N per minute" behind, stale.
    const mean = idleMeanMs(seq.idle);
    const cycleMs = mean + seq.clip.reduce((a, s) => a + s.durationMs, 0);
    parts.push(
      `idle ${seq.idle.minMs}-${seq.idle.maxMs}ms ${seq.idle.bias === "square" ? "right-skewed" : "uniform"}, mean ${mean}ms (~${Math.round(60000 / cycleMs)}/min)`,
    );
  }
  if (seq.clip.length) parts.push(seq.clip.map((s) => `${s.frame} ${s.durationMs}ms`).join(" &gt; "));
  if (seq.repeat) parts.push(`${Math.round(seq.repeat.chance * 100)}% double`);
  if (!parts.length) parts.push("no motion");
  return parts.join(" &middot; ");
}

// Draft sequences sort themselves into three roles from `compare`, so the page
// structure follows the data rather than a hand-kept list:
//   compare -> another DRAFT  = an either/or somebody has to settle
//   compare -> a SHIPPED one  = a superseded cadence, kept only for contrast
//   no compare                = new, judged on its own merits
const draftEntries = Object.entries(SEQUENCES).filter(([, s]) => s.draft);
const isDraft = (n) => Boolean(SEQUENCES[n]?.draft);
const decisions = draftEntries
  .filter(([, s]) => s.compare && isDraft(s.compare))
  .map(([altName, alt]) => [alt.compare, altName]);
const inDecision = new Set(decisions.flat());
const superseded = draftEntries.filter(([, s]) => s.compare && !isDraft(s.compare));
const soloNew = draftEntries.filter(([n, s]) => !s.compare && !inDecision.has(n));
// `verdict: "keep"` is set when a candidate is signed off at review, so the
// page shows what is still open rather than re-asking about settled poses.
const kept = soloNew.filter(([, s]) => s.verdict === "keep");
const undecided = soloNew.filter(([, s]) => !s.verdict);
const underReview = Boolean(decisions.length || undecided.length || kept.length);
const shippedSeqs = Object.entries(SEQUENCES).filter(([, s]) => !s.draft);

for (const [primary, alt] of decisions) {
  if (!SEQUENCES[primary]) throw new Error(`${alt}: compares against unknown sequence "${primary}"`);
}

// Page copy counts itself, so settling a decision (deleting the losing map)
// cannot leave the intro claiming there are still two of them.
const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const count = (n, noun) => `${WORDS[n] ?? n} ${noun}${n === 1 ? "" : "s"}`;

const card = (name) => {
  const seq = SEQUENCES[name];
  return `<figure class="card">
      <figcaption><b>${seq.label}</b>${seq.loop ? "" : ' <span class="tag">one-shot</span>'}<br><code class="key">${name}</code></figcaption>
      <div class="stage">${stack(name, seq)}</div>
      <p class="note">${seq.note}</p>
      <p class="timing">${timingText(seq)}</p>
    </figure>`;
};

const decisionBlock = ([primary, alt]) => `<section class="decide">
    <h2>${SEQUENCES[primary].question ?? "Which reads better?"}</h2>
    <div class="ab">${card(primary)}${card(alt)}</div>
  </section>`;

const detail = (title, blurb, names) => `<details>
    <summary>${title}</summary>
    <p class="blurb">${blurb}</p>
    <div class="ab">${names.map(card).join("")}</div>
  </details>`;

const previewHtml = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Overseer motion review</title>
<link rel="stylesheet" href="../../assets/mascot/animations.css">${hasDrafts ? '\n<link rel="stylesheet" href="candidates.css">' : ""}
<style>
  /* generated by scripts/gen-sprites.mjs - do not hand-edit. Page chrome only;
     every bit of mascot motion comes from the two stylesheets linked above. */
  :root { --ovr-w: 216px; }
  body { margin: 0; padding: 40px 48px 80px; background: #fdfbf7; color: #24201b; font: 14px/1.55 ui-monospace, Consolas, monospace; }
  h1 { font-size: 19px; margin: 0 0 6px; }
  h2 { font-size: 15px; margin: 0 0 14px; font-weight: 600; }
  p { margin: 4px 0; }
  .lede, .blurb { max-width: 76ch; color: #6e6659; }
  /* One size control for the whole page: every sequence is rendered once, and
     the true-size check is a click rather than three more copies of each. */
  .bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; margin: 22px 0 6px; padding: 10px 0; background: #fdfbf7; border-bottom: 1px solid rgba(36,32,27,0.16); }
  .bar span { color: #6e6659; font-size: 12px; }
  .bar button { font: inherit; font-size: 12px; padding: 4px 10px; background: #fff; color: #24201b; border: 1px solid rgba(36,32,27,0.22); border-radius: 8px; box-shadow: 0 2px 0 rgba(36,32,27,0.12); cursor: pointer; }
  .bar button.on { background: #c0562f; border-color: #c0562f; color: #fdfbf7; }
  .decide { margin: 40px 0; }
  .ab { display: flex; flex-wrap: wrap; gap: 18px; }
  .card { margin: 0; padding: 14px; width: 330px; background: #fff; border: 1px solid rgba(36,32,27,0.16); border-radius: 8px; box-shadow: 0 2px 0 rgba(36,32,27,0.08); }
  .card figcaption { font-size: 14px; margin-bottom: 10px; }
  .card .key { font-size: 11px; color: #6e6659; }
  .stage { display: flex; align-items: flex-end; justify-content: center; min-height: 168px; padding: 12px; background: #f6f1e8; border-radius: 8px; }
  .note { color: #6e6659; margin-top: 10px; }
  .timing { color: #c0562f; font-size: 12px; }
  .overseer { width: var(--ovr-w); }
  details { margin: 14px 0; padding: 12px 0; border-top: 1px solid rgba(36,32,27,0.16); }
  summary { cursor: pointer; font-size: 13px; }
  details .ab { margin-top: 12px; }
  .tag { display: inline-block; font-size: 10px; padding: 1px 5px; border: 1px solid rgba(36,32,27,0.2); border-radius: 3px; color: #6e6659; }
  .strip { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 12px; }
  .strip figure { margin: 0; }
  .strip figcaption { font-size: 11px; color: #6e6659; margin-top: 6px; max-width: 160px; }
  .strip .overseer { width: 144px; }
  /* Never leave it ambiguous why nothing is moving. */
  .rm-warn { display: none; margin: 16px 0; padding: 10px 14px; background: #fff; border: 1px solid #c0562f; border-radius: 8px; color: #c0562f; max-width: 76ch; }
  @media (prefers-reduced-motion: reduce) { .rm-warn { display: block; } }
</style>
<h1>Overseer motion review</h1>
<p class="lede">${
  underReview
    ? `${decisions.length ? `${count(decisions.length, "call")} to settle, then ` : ""}${count(undecided.length, "sequence")} still to accept or reject; ${count(kept.length, "sequence")} kept and awaiting promotion.`
    : `${count(shippedSeqs.length, "motion")} shipped, nothing under review.`
} Motion is the shipped <code>animations.css</code>${underReview ? " plus <code>candidates.css</code>" : ""}, linked not
restated, so this page cannot drift from what consumers get. One-shots replay
every 2.2s; click any mascot to replay it now.</p>
<p class="rm-warn"><b>Reduced motion is on</b>, so nothing here will move: every stack is
resting on the canonical frame, which is the correct rendering. Turn off
"animation effects" in your OS accessibility settings to review the motion.</p>

<div class="bar">
  <span>size</span>
  <button data-x="12" class="on">12x</button>
  <button data-x="5">5x &middot; 90dp, mobile connect</button>
  <button data-x="4">4x &middot; 72dp, pairing</button>
  <button data-x="3">3x &middot; 54dp</button>
</div>

${decisions.map(decisionBlock).join("\n")}

${
  undecided.length
    ? `<section class="decide">
  <h2>Still open: ${count(undecided.length, "sequence")} to accept or reject</h2>
  <div class="ab">${undecided.map(([n]) => card(n)).join("")}</div>
</section>`
    : ""
}

${
  kept.length
    ? `<section class="decide">
  <h2>Kept at review &middot; pending promotion to assets/</h2>
  <p class="blurb">Signed off, but still generated to exploration/ only. Promoting is deleting a
  <code>draft</code> flag, which writes the frames into assets/mascot/ and adds the sequences to
  the shipped manifest and CSS.</p>
  <div class="ab">${kept.map(([n]) => card(n)).join("")}</div>
</section>`
    : ""
}

${
  // Collapse the settled set only while something is actually under review and
  // competing for attention. With nothing open, these ARE the page.
  underReview
    ? detail(
        "Already shipped (settled)",
        "In assets/mascot/ and in the manifest today. Here for reference, not for review.",
        shippedSeqs.map(([n]) => n),
      )
    : `<section class="decide">
  <h2>Supported motions &middot; ${count(shippedSeqs.length, "sequence")}</h2>
  <p class="blurb">Everything in <code>assets/mascot/animations.json</code> and
  <code>animations.css</code>. Nothing is under review.</p>
  <div class="ab">${shippedSeqs.map(([n]) => card(n)).join("")}</div>
</section>`
}

${detail(
  "Superseded cadences (settled)",
  "The timings that lost. Kept only so the canonicalisation is checkable against motion rather than a table.",
  superseded.map(([n]) => n),
)}

<details>
  <summary>Frames (static reference)</summary>
  <p class="blurb"><b>exclusive</b> means the pose vacates a pixel the rest frame paints, so a
  stacked consumer must hide the rest frame in exact inverse lockstep; the generated CSS always
  does. <b>overlay</b> means it covers the rest frame completely.</p>
  <div class="strip">
${Object.entries(FRAMES)
  .map(
    ([k, f]) => `    <figure><div class="overseer"><div class="overseer-frame" style="visibility:visible" aria-hidden="true"><svg viewBox="0 0 ${GRID.columns} ${GRID.rows}" shape-rendering="crispEdges"><use href="#ovr-${k}"/></svg></div></div><figcaption><b>${k}</b> &middot; ${f.file}<br>rows ${f.changedRows.length ? f.changedRows.join(", ") : "-"} &middot; ${f.compositing}${f.draft ? ' <span class="tag">draft</span>' : ""}</figcaption></figure>`,
  )
  .join("\n")}
  </div>
</details>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${symbolDefs}</defs></svg>
<script>
  // Review affordances, this page only - the shipped CSS stays script-free.
  (function () {
    // Size: one control for every mascot on the page. Integer multiples of the
    // ${GRID.columns}x${GRID.rows} grid only; fractional scaling blurs the pixels.
    var bar = document.querySelector(".bar");
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-x]");
      if (!b) return;
      document.documentElement.style.setProperty("--ovr-w", ${GRID.columns} * Number(b.dataset.x) + "px");
      bar.querySelectorAll("button").forEach(function (o) { o.classList.toggle("on", o === b); });
    });

    // A one-shot (the waves) plays once and is over in 600ms, which reads as
    // "frozen" on a review page. Replay on a timer and on click, using the
    // forced-reflow restart idiom. Skipped under reduced motion, where resting
    // on the canonical frame is the correct rendering.
    if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    var shots = [].slice.call(document.querySelectorAll('.overseer[data-loop="false"]'));
    function replay() {
      shots.forEach(function (el) {
        var cls = [].slice.call(el.classList).filter(function (c) { return c.indexOf("overseer--") === 0; })[0];
        if (!cls) return;
        el.classList.remove(cls);
        void el.offsetWidth; // reflow, so re-adding restarts the one-shot
        el.classList.add(cls);
      });
    }
    setInterval(replay, 2200);
    document.addEventListener("click", function (e) { if (e.target.closest(".overseer")) replay(); });
  })();
</script>
</html>
`;
await writeFile(join(EXPLORE, "animation-preview.html"), previewHtml);

// Alternates -> exploration/mascot only.
for (const [name, { map, label }] of Object.entries(ALTERNATES)) {
  await writeFile(join(EXPLORE, `${name}.svg`), buildSvg(map, { unit: 1, label }) + "\n");
  await sharp(Buffer.from(buildSvg(map, { unit: 16, label }))).png().toFile(join(EXPLORE, `${name}.png`));
}

const shippedFrames = Object.values(FRAMES).filter((f) => !f.draft).length;
const draftFrames = Object.values(FRAMES).length - shippedFrames;
console.log(
  `Wrote ${shippedFrames} frames + animations.{json,css} (${shippedSeqs.length} sequences) to assets/mascot/, ` +
    `and ${draftFrames} draft frames, ${hasDrafts ? "candidates.css, " : ""}the demo page and ${Object.keys(ALTERNATES).length} alternates to exploration/mascot/`,
);
