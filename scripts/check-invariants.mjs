// check-invariants.mjs - the mechanical gate for /brand-review. Read-only,
// deterministic, no deps: it verifies the invariants the .claude/rules and the
// design-language skill declare, and that a grep can decide, then prints a
// PASS/FAIL findings report and exits nonzero on any FAIL. The aesthetic call
// ("reads as craft, not AI clip-art") is NOT here - it stays a human decision.
//
// Checks: palette membership, sprite constraints, mark tiering (no card-K on a
// downscaled master), frozen-K / single-source geometry, banned colors.
// archive/ is frozen and never scanned. Usage: npm run check
//
// Sources of truth cross-referenced here (change them, not this file):
//   scripts/lib/mark.mjs, scripts/lib/sprite.mjs, the .claude/rules/*.md,
//   the design-language skill's palette tokens + banned list.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

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

// Shipped vector assets consumers embed. resources/web/brandmark*.svg are
// byte copies of the assets/ ones (gen-icons copyFile), scanned for defense.
const SHIPPED_SVG = [
  "assets/brandmark.svg",
  "assets/brandmark-small.svg",
  "assets/brandmark-filled.svg",
  "assets/mascot/overseer.svg",
  "resources/web/brandmark.svg",
  "resources/web/brandmark-small.svg",
].filter(has);

// The brandmark/icon SVGs specifically (no mascot) - these must never carry a
// <text> element (the K is frozen K_PATH -> <path>, font-independent).
const BRANDMARK_SVG = SHIPPED_SVG.filter((p) => /brandmark/.test(p));

const spriteSvgs = () => {
  const dir = join(ROOT, "assets", "mascot");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => `assets/mascot/${f}`);
};

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

  // The squarePng definition must pass F4K (not card-K) as its mark.
  const def = stmt("const squarePng");
  if (!def) findings.push(`${file}: squarePng definition not found`);
  else if (cardK.test(def)) findings.push(`${file}: squarePng is fed card-K - a downscaled master must be F4k`);

  // Each downscaled single-image master write must resolve to F4K/squarePng.
  const masters = [
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "ios-appstore-1024.png",
    "android-playstore-512.png",
    "android-adaptive-foreground.png",
  ];
  for (const name of masters) {
    const s = stmt(`"${name}"`);
    if (!s) { findings.push(`${file}: write for ${name} not found`); continue; }
    if (cardK.test(s)) findings.push(`${file}: ${name} sourced from card-K - downscaled masters stay F4k`);
    if (!/F4K|squarePng/.test(s)) findings.push(`${file}: ${name} does not resolve to F4k (F4K/squarePng)`);
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

// ---------------------------------------------------------------------------
const order = ["PALETTE", "SPRITE", "TIERING", "FROZEN-K", "BANNED"];
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
