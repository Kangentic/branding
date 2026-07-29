// check-invariants.mjs - the mechanical gate for /brand-review. Read-only,
// deterministic, no deps: it verifies the invariants the .claude/rules and the
// design-language skill declare, and that a grep can decide, then prints a
// PASS/FAIL findings report and exits nonzero on any FAIL. The aesthetic call
// ("reads as craft, not AI clip-art") is NOT here - it stays a human decision.
//
// Checks: palette membership, sprite constraints, mark tiering (no card-K on a
// downscaled master), frozen-K / single-source geometry, banned colors, and the
// shared animation contract (motion budget, compositing safety, packaging).
// archive/ is frozen and never scanned. Usage: npm run check
//
// Sources of truth cross-referenced here (change them, not this file):
//   scripts/lib/mark.mjs, scripts/lib/sprite.mjs, the .claude/rules/*.md,
//   the design-language skill's palette tokens + banned list.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
// The only executed import: the mark builders, so the mobile-variant geometry
// contract can be asserted behaviorally instead of by grepping for a name.
// lib/mark.mjs is pure declarations and pure functions - importing it has no
// side effects and pulls in no third-party dependency.
import { f4kParts, f4kAlphaParts } from "./lib/mark.mjs";
// Same contract: pure declarations and pure functions, no side effects. The
// promoted-direction guard is a FUNCTION in that lib rather than a module-scope
// throw, precisely so importing it here cannot crash the gate.
import {
  VIEW as A_VIEW,
  STROKE as A_STROKE,
  fileFor as aFileFor,
  manifest as aManifest,
  markSvg as aMarkSvg,
  motionCss as aMotionCss,
  shippedSet as aShippedSet,
} from "./lib/activity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
const read = (p) => readFileSync(p, "utf8");
const has = (p) => existsSync(join(ROOT, p));
const load = (p) => read(join(ROOT, p));

// The four Warm Craft brand tokens (design-language), normalized lowercase.
const BRAND = ["fdfbf7", "24201b", "c0562f", "e8a33d"];
// Mask / luminance keys - structural, not brand color. Allowed in the marks
// (knockout masks paint #fff/#000) but never in a sprite.
const STRUCT = ["fff", "000", "ffffff", "000000"];

const spriteSvgs = () => {
  const dir = join(ROOT, "assets", "mascot");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => `assets/mascot/${f}`);
};

// Globbed for the same reason the mascot list is: an enumerated list goes stale
// the moment a mark is added, and the new file is then invisible to PALETTE and
// BANNED without anything failing.
const activitySvgs = () => {
  const dir = join(ROOT, "assets", "activity");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => `assets/activity/${f}`);
};

// Shipped vector assets consumers embed. resources/web/brandmark*.svg are
// byte copies of the assets/ ones (gen-icons copyFile), scanned for defense.
// The mascot list is globbed, not enumerated: pose frames used to be invisible
// to the PALETTE and BANNED checks because only overseer.svg was listed, so
// every new frame had to remember to register itself. It no longer does.
const SHIPPED_SVG = [
  "assets/brandmark.svg",
  "assets/brandmark-small.svg",
  "assets/brandmark-filled.svg",
  "assets/brandmark-mono.svg",
  "assets/brandmark-mono-amber.svg",
  ...spriteSvgs(),
  ...activitySvgs(),
  "resources/web/brandmark.svg",
  "resources/web/brandmark-small.svg",
].filter(has);

// The brandmark/icon SVGs specifically (no mascot) - these must never carry a
// <text> element (the K is frozen K_PATH -> <path>, font-independent).
const BRANDMARK_SVG = SHIPPED_SVG.filter((p) => /brandmark/.test(p));

// Every generator/source file under scripts/ (archive/ is not under scripts/,
// so it is excluded by construction). Used for single-source declaration scans.
function scriptFiles() {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if ([".mjs", ".js"].includes(extname(p))) out.push(p);
    }
  };
  walk(join(ROOT, "scripts"));
  return out;
}

const hexes = (s) =>
  [...s.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map((m) => m[1].toLowerCase());
const fills = (s) =>
  [...s.matchAll(/fill="#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})"/g)].map((m) => m[1].toLowerCase());

// ---------------------------------------------------------------------------
// Checks. Each returns an array of finding strings (empty = pass).
// ---------------------------------------------------------------------------
const checks = {};

// 1. Palette membership: every hex in a shipped SVG is a brand token or a
//    structural mask key. No off-palette color reaches a consumer.
checks.PALETTE = () => {
  const allow = new Set([...BRAND, ...STRUCT]);
  const findings = [];
  for (const p of SHIPPED_SVG) {
    for (const hx of new Set(hexes(load(p)))) {
      if (!allow.has(hx)) findings.push(`${p}: off-palette #${hx}`);
    }
  }
  return findings;
};

// 2. Sprite constraints (pixel-art-conventions): <=4 fills, all brand tokens;
//    crispEdges present; integer scale only (no fractional scale()); rect grid
//    only (no freehand <path>); the OVERSEER map declared once in lib/sprite.mjs.
checks.SPRITE = () => {
  const brand = new Set(BRAND);
  const findings = [];
  for (const p of spriteSvgs()) {
    const src = load(p);
    const used = new Set(fills(src));
    if (used.size > 4) findings.push(`${p}: ${used.size} fills (>4)`);
    for (const hx of used) if (!brand.has(hx)) findings.push(`${p}: non-palette sprite fill #${hx}`);
    if (!/shape-rendering="crispEdges"/.test(src)) findings.push(`${p}: missing shape-rendering="crispEdges"`);
    if (/scale\(\s*[0-9]*\.[0-9]+/.test(src)) findings.push(`${p}: fractional scale() (integer scale only)`);
    if (/<path\b/.test(src)) findings.push(`${p}: freehand <path> (sprites are rect grids)`);
  }
  const owners = scriptFiles().filter((f) => rel(f) !== "scripts/lib/sprite.mjs" && rel(f) !== "scripts/check-invariants.mjs");
  for (const f of owners) {
    if (/\bOVERSEER\s*=/.test(read(f))) findings.push(`${rel(f)}: re-declares OVERSEER (declare only in lib/sprite.mjs)`);
  }
  return findings;
};

// 3. Mark tiering (mark-geometry-single-source): no OS-downscaled single-image
//    master may be fed card-K. squarePng is the chokepoint for the store/PWA/
//    apple-touch surfaces, so it must resolve to F4K; the adaptive foreground
//    builds its mark inline and must reference F4K too. Feeding markFor/
//    cardKParts/discPng/a >=128 ladder entry into any of them is the wrong-icon
//    bug this rule exists for. web/logo.png (card-K, shown large) is exempt.
checks.TIERING = () => {
  const findings = [];
  const file = "scripts/gen-icons.mjs";
  if (!has(file)) return [`${file}: missing`];
  const src = load(file);
  const stmt = (needle) => {
    const i = src.indexOf(needle);
    if (i < 0) return null;
    const end = src.indexOf(";", i);
    return src.slice(i, end < 0 ? undefined : end);
  };
  const cardK = /markFor\s*\(|cardKParts\s*\(|discPng\s*\(|pngs\[\s*(?:128|256|512|1024)\s*\]/;
  // Every builder that resolves to the F4k board glyph. Case matters: the
  // lowercase f4k* builders would not match a bare /F4K/.
  const f4k = /F4K|squarePng|f4kParts\s*\(|f4kAlphaParts\s*\(|f4kMonoSvg\s*\(/;

  // The squarePng definition must pass F4K (not card-K) as its mark.
  const def = stmt("const squarePng");
  if (!def) findings.push(`${file}: squarePng definition not found`);
  else if (cardK.test(def)) findings.push(`${file}: squarePng is fed card-K - a downscaled master must be F4k`);

  // Each downscaled single-image master write must resolve to an F4k builder.
  // Deliberately NOT here: splash-1024.png (displays large, so it is correctly
  // card-K and would fail the F4k assertion) and
  // android-feature-graphic-1024x500.png (a marketing raster, not an icon
  // master - it carries no mark to tier).
  const masters = [
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "ios-appstore-1024.png",
    "ios-appstore-1024-dark.png",
    "ios-appstore-1024-tinted.png",
    "android-playstore-512.png",
    "android-adaptive-foreground.png",
    "android-adaptive-monochrome.png",
    "notification-icon.png",
  ];
  for (const name of masters) {
    const s = stmt(`"${name}"`);
    if (!s) { findings.push(`${file}: write for ${name} not found`); continue; }
    if (cardK.test(s)) findings.push(`${file}: ${name} sourced from card-K - downscaled masters stay F4k`);
    if (!f4k.test(s)) findings.push(`${file}: ${name} does not resolve to F4k (${f4k.source})`);
  }

  // The tint-driven renditions (iOS tinted, the Android 13+ themed layer)
  // claim CANONICAL geometry with the card knocked out as a FOURTH hole. The
  // grep above only proves the builder is referenced, so assert the builder's
  // actual contract here - otherwise the claim decays into a comment.
  const colorParts = f4kParts();
  const alphaParts = f4kAlphaParts();
  const holeCount = (p) => (p.holes.match(/<rect/g) ?? []).length;
  if (holeCount(alphaParts) !== holeCount(colorParts) + 1) {
    findings.push(`lib/mark.mjs: f4kAlphaParts must knock the card out as exactly one extra hole (colored ${holeCount(colorParts)}, alpha ${holeCount(alphaParts)})`);
  }
  if (alphaParts.filled !== "") {
    findings.push(`lib/mark.mjs: f4kAlphaParts must paint nothing on top - a filled overlay defeats a single-color tinted layer`);
  }
  return findings;
};

// 4. Frozen K + single-source geometry (mark-geometry-single-source): no <text>
//    in a shipped brandmark/icon SVG (the K is path data), and no geometry
//    constant declared outside lib/mark.mjs.
checks["FROZEN-K"] = () => {
  const findings = [];
  for (const p of BRANDMARK_SVG) {
    if (/<text\b/.test(load(p))) findings.push(`${p}: contains <text> (render the K as frozen K_PATH, never <text>)`);
  }
  const GEO = [
    "K_PATH", "K_B", "K_SIZE", "K_BASE", "K_BASELINE_IN_EM",
    "ARM_A", "ARM_D", "CUT_CANON", "CUT_SMALL",
    "CARD_MARGIN", "CARD_RING", "CARD_RX", "K_DISC_CLEAR",
  ];
  const owners = scriptFiles().filter((f) => rel(f) !== "scripts/lib/mark.mjs" && rel(f) !== "scripts/check-invariants.mjs");
  for (const f of owners) {
    const src = read(f);
    for (const name of GEO) {
      if (new RegExp(`(?:^|\\s)(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=`).test(src)) {
        findings.push(`${rel(f)}: re-declares geometry constant ${name} (declare only in lib/mark.mjs)`);
      }
    }
  }
  return findings;
};

// 5. Banned colors - the grep-able slice of the anti-template checklist
//    (design-language): no navy/indigo/purple families, no gradient fills.
//    The full 10-item checklist is a human/LLM pass in the skill.
checks.BANNED = () => {
  const findings = [];
  const banned = [
    [/#13151f\b/i, "navy #13151f-family"],
    [/#5b7bf2\b/i, "indigo #5b7bf2-family"],
    [/<(?:linear|radial)Gradient\b/i, "gradient fill"],
    [/url\(#[^)]*gradient/i, "gradient reference"],
  ];
  for (const p of SHIPPED_SVG) {
    const src = load(p);
    for (const [re, label] of banned) if (re.test(src)) findings.push(`${p}: ${label}`);
  }
  return findings;
};

// 6. Mono variants (theme-safe): the in-app marks consumers tint per theme.
//    brandmark-mono.svg must be pure currentColor (it doubles as the tray
//    template source); brandmark-mono-amber.svg may carry ONLY the amber
//    token on top of currentColor. Neither may carry defs/masks/ids - they
//    are inlined repeatedly and used as CSS masks.
checks.MONO = () => {
  const SPEC = [
    { p: "assets/brandmark-mono.svg", allow: [] },
    { p: "assets/brandmark-mono-amber.svg", allow: ["e8a33d"] },
  ];
  const findings = [];
  for (const { p, allow } of SPEC) {
    if (!has(p)) { findings.push(`${p}: missing (theme-safe in-app mark)`); continue; }
    const src = load(p);
    if (!/currentColor/.test(src)) findings.push(`${p}: no currentColor fill`);
    const literal = [...new Set(hexes(src))].filter((h) => !allow.includes(h)).map((h) => `#${h}`);
    if (literal.length) {
      const beyond = allow.length ? "beyond the amber accent" : "(mono must be currentColor only)";
      findings.push(`${p}: literal color ${literal.join(", ")} ${beyond}`);
    }
    if (/<(?:mask|defs)\b|\bid="/.test(src)) findings.push(`${p}: carries defs/mask/id (must stay inline-safe)`);
  }
  return findings;
};

// 7. The shared animation contract (assets/mascot/animations.{json,css}).
//    The motion budget used to be prose in design-language; now that sequences
//    ship as data it is enforceable. This also guards the two failure modes
//    that stay invisible until a consumer breaks: a pose that VACATES a pixel
//    with no inverse track (the rest frame bleeds through underneath), and an
//    `exports` map that silently kills every consumer's deep asset import.
checks.ANIMATION = () => {
  const jsonPath = "assets/mascot/animations.json";
  const cssPath = "assets/mascot/animations.css";
  if (!has(jsonPath) || !has(cssPath)) return [`${jsonPath} / ${cssPath} missing (run npm run gen:sprites)`];

  let manifest;
  try {
    manifest = JSON.parse(load(jsonPath));
  } catch (e) {
    return [`${jsonPath}: not valid JSON (${e.message})`];
  }

  const findings = [];
  const css = load(cssPath);
  const frames = manifest.frames ?? {};
  const rest = manifest.restFrame;

  for (const [key, f] of Object.entries(frames)) {
    if (!has(`assets/mascot/${f.file}`)) findings.push(`${jsonPath}: frame "${key}" names a missing file ${f.file}`);
  }

  for (const [name, seq] of Object.entries(manifest.sequences ?? {})) {
    if (seq.reducedMotion !== rest) {
      findings.push(`${name}: reducedMotion must be "${rest}" (reduced motion is a rendering, not a mute button)`);
    }
    const used = [...new Set([...(seq.idle ? [seq.idle.frame] : []), ...(seq.clip ?? []).map((s) => s.frame)])];
    if (!used.length) continue; // e.g. `none`: the base composition IS the rendering
    // Motion budget (design-language): a stepped swap between 2-4 poses.
    if (used.length > 4) findings.push(`${name}: ${used.length} distinct frames (motion budget is 4)`);
    for (const f of used) if (!frames[f]) findings.push(`${name}: references frame "${f}" the manifest does not declare`);
    // Exactly one frame visible at a time is what makes an `exclusive` pose
    // safe. Every frame the sequence touches, PLUS the rest frame it covers,
    // needs its own track or the rest frame shows through the vacated pixels.
    for (const f of new Set([...used, rest])) {
      if (!css.includes(`.overseer--${name} .overseer-frame--${f} {`)) {
        findings.push(`${name}: no CSS track for frame "${f}" (an exclusive pose would let ${rest} bleed through)`);
      }
    }
  }

  // A fill mode breaks the desktop app's animations-off setting, which zeroes
  // animation-duration: a FILLED 0s animation snaps to its 100% keyframe
  // instead of falling back to the canonical frame.
  if (/fill-mode|animation:[^;]*\b(?:forwards|backwards|both)\b/.test(css)) {
    findings.push(`${cssPath}: uses an animation fill mode (breaks a zeroed animation-duration)`);
  }
  if (!/prefers-reduced-motion/.test(css)) findings.push(`${cssPath}: no prefers-reduced-motion block`);

  // Deep asset imports are how the consumers read this package: kangentic.com
  // and the desktop app both do `@kangentic/branding/assets/...svg?raw`. There
  // is no `exports` map today, so those resolve through Node's legacy subpath
  // fallback. Adding one without re-exposing ./assets/* breaks every consumer,
  // and none of their test suites would catch it.
  const pkg = JSON.parse(load("package.json"));
  if (pkg.exports && !pkg.exports["./assets/*"]) {
    findings.push('package.json: "exports" map without "./assets/*" (breaks consumer deep imports of assets/)');
  }
  // resources/ is deep-imported too - electron-builder.yml and the website's
  // sync script both reach into it - and it was not covered here.
  if (pkg.exports && !pkg.exports["./resources/*"]) {
    findings.push('package.json: "exports" map without "./resources/*" (breaks consumer deep imports of resources/)');
  }

  return findings;
};

// 8. The activity icon set (activity-icon-geometry). Five things a grep can
//    decide, and one it cannot: the strongest assertion here is BEHAVIOURAL,
//    following how TIERING imports the mark builders - the shipped SVG bytes
//    must equal what lib/activity.mjs produces, so a hand-edit or a stale
//    commit fails here rather than at the next regeneration.
checks.ACTIVITY = () => {
  const jsonPath = "assets/activity/activity.json";
  const cssPath = "assets/activity/activity.css";
  const svgs = activitySvgs();
  if (!svgs.length) return []; // set not promoted yet: nothing to enforce
  if (!has(jsonPath) || !has(cssPath)) return [`${jsonPath} / ${cssPath} missing (run npm run gen:activity)`];

  const findings = [];
  let set;
  try {
    set = aShippedSet();
  } catch (e) {
    return [`lib/activity.mjs: ${e.message}`];
  }

  // Grid contract: one viewBox, one stroke weight, currentColor only. A hex in
  // an activity SVG would defeat the whole point - these tint per surface, and
  // the three consumers do NOT share status token values.
  for (const p of svgs) {
    const src = load(p);
    if (!src.includes(`viewBox="0 0 ${A_VIEW} ${A_VIEW}"`)) findings.push(`${p}: not on the ${A_VIEW} grid`);
    if (!src.includes(`stroke-width="${A_STROKE}"`)) findings.push(`${p}: stroke-width is not ${A_STROKE}`);
    if (hexes(src).length) findings.push(`${p}: carries a hex color (activity marks are currentColor only)`);
    if (!/stroke="currentColor"/.test(src)) findings.push(`${p}: no currentColor stroke`);
  }

  // Behavioural: bytes must equal the builder output, mark for mark.
  const expected = new Set();
  for (const m of set.marks) {
    const p = `assets/activity/${aFileFor(m)}`;
    expected.add(aFileFor(m));
    if (!has(p)) {
      findings.push(`${p}: missing (declared by lib/activity.mjs)`);
      continue;
    }
    if (load(p) !== aMarkSvg(m, { size: A_VIEW }) + "\n") {
      findings.push(`${p}: drifts from lib/activity.mjs output (regenerate, never hand-edit)`);
    }
  }
  for (const f of svgs.map((p) => basename(p))) {
    if (!expected.has(f)) findings.push(`assets/activity/${f}: not declared by lib/activity.mjs (stale file)`);
  }

  // The manifest and the CSS are one contract; check them against each other.
  let manifest;
  try {
    manifest = JSON.parse(load(jsonPath));
  } catch (e) {
    return [...findings, `${jsonPath}: not valid JSON (${e.message})`];
  }
  if (load(jsonPath) !== JSON.stringify(aManifest(), null, 2) + "\n") {
    findings.push(`${jsonPath}: drifts from lib/activity.mjs output`);
  }
  if (load(cssPath) !== aMotionCss() + "\n") findings.push(`${cssPath}: drifts from lib/activity.mjs output`);

  const css = load(cssPath);
  for (const [id, m] of Object.entries(manifest.marks ?? {})) {
    if (!has(`assets/activity/${m.file}`)) findings.push(`${jsonPath}: mark "${id}" names a missing file ${m.file}`);
    // A mark that declares motion needs a keyframe track, or it ships still.
    if (m.motion && !css.includes(`@keyframes ${manifest.motion?.[m.motion]?.keyframes}`)) {
      findings.push(`${id}: motion "${m.motion}" has no keyframes in ${cssPath}`);
    }
    // A dash in ratio units is useless to a runtime without pathLength, which
    // is the majority of what this package ships to. Both must be present.
    if (m.dash && !m.dashUserUnits) findings.push(`${id}: dash without dashUserUnits (breaks react-native-svg and librsvg)`);
    // The declared rest rendering has to actually exist in the CSS, not just be
    // asserted in the manifest.
    if (m.reducedMotion === "drop-dash" && !/prefers-reduced-motion[\s\S]*drop-dash[\s\S]*stroke-dasharray:\s*none/.test(css)) {
      findings.push(`${id}: declares drop-dash but ${cssPath} never clears the dash under reduced motion`);
    }
  }

  // Same two compositing rules the mascot motion carries, for the same reasons.
  if (/fill-mode|animation:[^;]*\b(?:forwards|backwards|both)\b/.test(css)) {
    findings.push(`${cssPath}: uses an animation fill mode (breaks a zeroed animation-duration)`);
  }
  if (!/prefers-reduced-motion/.test(css)) findings.push(`${cssPath}: no prefers-reduced-motion block`);

  // Single-source geometry, the FROZEN-K rule applied to this set.
  const GEO = ["INK_BOX", "R_ENVELOPE", "R_CHIP", "RING_R", "FLAP_VARIANTS", "PROMPT_D", "CONTROL_RING_R", "DASH_SPINNER", "DASH_CHIP"];
  const owners = scriptFiles().filter(
    (f) => rel(f) !== "scripts/lib/activity.mjs" && rel(f) !== "scripts/check-invariants.mjs",
  );
  for (const f of owners) {
    const src = read(f);
    for (const name of GEO) {
      if (new RegExp(`(?:^|\\s)(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=`).test(src)) {
        findings.push(`${rel(f)}: re-declares activity constant ${name} (declare only in lib/activity.mjs)`);
      }
    }
  }

  return findings;
};

// ---------------------------------------------------------------------------
const order = ["PALETTE", "SPRITE", "TIERING", "FROZEN-K", "BANNED", "MONO", "ANIMATION", "ACTIVITY"];
let failed = 0;
console.log("Kangentic brand invariants (mechanical gate)\n");
for (const name of order) {
  let findings;
  try {
    findings = checks[name]();
  } catch (e) {
    findings = [`check error: ${e.message}`];
  }
  const pad = name.padEnd(9);
  if (findings.length === 0) {
    console.log(`  ${pad} PASS`);
  } else {
    failed += findings.length;
    console.log(`  ${pad} FAIL`);
    for (const f of findings) console.log(`      - ${f}`);
  }
}
console.log("");
if (failed) {
  console.log(`${failed} blocking finding${failed === 1 ? "" : "s"}. Mechanical invariants must pass before human sign-off.`);
  process.exit(1);
}
console.log("All mechanical invariants pass. Aesthetic sign-off is still a human decision.");
