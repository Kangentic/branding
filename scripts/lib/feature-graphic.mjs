// lib/feature-graphic.mjs - THE store hero lockup, declared once so every
// store surface and the review sheet cannot drift. It is set in three frames:
// the Play Store feature graphic (1024x500) and the App Store product-page
// header (3840x1646) and search-results art (3840x2560). gen-icons.mjs writes
// the shipped assets from it; gen-review.mjs renders review sheets from the
// same functions.
//
// Constraints the feature graphic answers, from Google Play's own preview-assets
// spec: the asset is REQUIRED to publish on every track beyond internal
// testing, it must carry no alpha channel, Play crops it in some placements,
// and Play warns off pure white / black / dark grey grounds. Hence a
// saturated brand-rust ground, a 104px inset on everything (just over 10%,
// clear of the edge cutoff zones), and NO full-bleed edge bar (the social
// image's rust bar at x=0 would be the first thing cropped).
//
// Layout, settled 2026-08-03 across three annotated maintainer rounds: two
// columns on one grid. Left, the cream wordmark, the amber rule, and a
// three-line STACK; right, the Overseer on a cream card. The card top sits ON
// the wordmark cap line and the card bottom ON the stack's last baseline -
// those two shared edges are what make the lockup settle, and the first
// round's finding was exactly their absence (an 8px near-miss at the top, an
// 8px rub at the bottom).
//
// The stack replaced the 2.7.1 bottom-run proof line, and the correction of
// record: that layout's rationale said a side-by-side proof line "forces
// 14px", which was true only of a ONE-line tag. Three stacked lines clear
// the card horizontally at 35px each, taller than the bottom run's 21px ever
// was. Each line leads with its first word in cream and lets the rest step
// back to a soft warm cream.
//
// The stack's COPY changed 2026-10-12. It used to derive from PROOF_LINE
// ("15 AGENT CLIS / 100% LOCAL / $0 FOREVER"), the social image's line. The
// store art now sets its own STORE_LINE, for three reasons:
//   - Both stores bar price claims in this art. Apple: "Don't include ...
//     specific pricing, discounts". Play's listing best practices, for the
//     feature graphic: "your images and text should not indicate the price and
//     promotional information". "$0 FOREVER" could not stay.
//   - The CLI count goes stale. It went 11, 12, 15, and each bump needed a new
//     5x7 glyph and a regenerate of every surface. Store copy should never need
//     a bump.
//   - This art sells the MOBILE app; a desktop CLI count is not what someone
//     choosing a phone app weighs.
// Picked at maintainer sign-off from four rendered sets: trust facts. The
// backup is the "what the app does" set, "WATCH AGENTS / ANSWER PROMPTS /
// REVIEW DIFFS". A blend of the two was rendered and rejected: each set stays
// one idea. "100% LOCAL" was weighed against the mobile app's relay path (the
// relay only forwards end-to-end encrypted traffic) and kept. A two-line
// price-free proof stack was also reviewed and dropped, because a three-line
// set keeps the settled rhythm above unchanged. The social image still sets
// PROOF_LINE: it sells the desktop app, where the CLI count is the proof.
//
// The App Store frames (added 2026-10-12, for the iOS 27 "Header and Search
// Results" tab) re-set the SAME lockup rather than stretching the 1024x500
// raster: lockupSvg() takes an INTEGER multiplier k, so every sprite and font
// scale stays an integer and every constant below is multiplied, never
// re-declared. Apple crops both assets per device and orientation and
// publishes no safe-area numbers on its own pages; the art-safe boxes in
// APP_STORE_SLOTS are the figures third-party guides read out of Apple's
// templates (asoagency, appscreens and storeheader agree). They are
// UNVERIFIED until an App Store Connect Preview pass, so the lockup is
// centred on the frame and the flanks carry nothing but ground.
//
// Not shipped: Apple's 16:9 universal (5244x2950), which can fill both slots
// with one file. Its reported safe box is 1402 wide, the overlap of both
// crops, so the largest integer lockup that fits is 1x: 816px, 15.6% of the
// canvas width against 42.5% in the dedicated header. The two dedicated files
// cover both slots at full size, so it would add nothing.
//
// The wordmark comes from lib/pixelfont.mjs and the Overseer from
// lib/sprite.mjs at an INTEGER scale, so there is no font dependency and the
// pixels stay crisp.

import { RUST, CREAM, AMBER } from "./mark.mjs";
import { OVERSEER, rects as spriteRects, PALETTE } from "./sprite.mjs";
import { word } from "./pixelfont.mjs";

export const FEATURE_W = 1024;
export const FEATURE_H = 500;
export const FEATURE_FILE = "android-feature-graphic-1024x500.png";

// PAD is just over 10% of the width on purpose. Play crops this asset in
// some placements and warns against key elements (logo, app name, slogan)
// sitting in the edge cutoff zones, so nothing here starts inside 10%.
const PAD = 104;
const WORD_SCALE = 8; // 7px glyphs -> 56px cream wordmark
const WORD_Y = 108;
const RULE_H = 10;
const RULE_GAP = 30;
const STAT_SCALE = 5; // 7px glyphs -> 35px stack lines
// The Overseer's card (ROO_ prefix: "card" alone already names the brandmark
// card in lib/mark.mjs, and the single-source gate rightly rejects reusing
// those constant names). Its top sits ON the wordmark cap line: both start at
// the lockup's y, so the shared edge is structural rather than a constant.
const ROO_CARD_W = 344;
const ROO_CARD_H = 294;
const ROO_CARD_RX = 14;
// The crisp offset shadow, straight down like every card in the system
// (box-shadow 0 2px 0 at UI scale) - never a blur.
const ROO_CARD_SHADOW_DY = 6;
const ROO_CARD_SHADOW = "rgba(36,32,27,0.28)";
const ROO_SCALE = 16; // 18x12 grid -> 288x192, integer only
const STAT_SOFT = "#e9c9b8"; // the trailing words; the cream first word leads

const MARK = word("KANGENTIC", CREAM);
const ROO = spriteRects(OVERSEER, { unit: 1, palette: PALETTE });

// The column gap is what the feature graphic leaves between the wordmark and
// the card when the card sits right-aligned on PAD: 1024 - 104 - 344 - (104 +
// 424) = 48. Derived from that frame, so the 1024x500 graphic keeps its
// symmetric inset by construction and every larger frame inherits its rhythm.
const LOCKUP_GAP = FEATURE_W - PAD - ROO_CARD_W - (PAD + MARK.w * WORD_SCALE);

// THE store stack copy (see the header for why it is not PROOF_LINE). Every
// glyph must exist in lib/pixelfont.mjs; word() throws otherwise.
export const STORE_LINE = "NO ACCOUNT / E2E ENCRYPTED / 100% LOCAL";

// The stack lines, split at the separators. Each line's first token leads.
const STACK = STORE_LINE.split(" / ").map((line) => {
  const [lead, ...rest] = line.split(" ");
  return { lead, words: rest.join(" ") };
});

// One stack line: the lead word in cream, the rest in soft cream, joined at
// word()'s own space advance (trailing letterspace + 4-unit space = 5).
const stackLine = ({ lead, words }) => {
  const n = word(lead, CREAM);
  const w = word(words, STAT_SOFT);
  return `${n.svg}<g transform="translate(${n.w + 5},0)">${w.svg}</g>`;
};

// The lockup's footprint at multiplier k: the wordmark column, the gap and the
// card. h is the card box (cap line to last baseline); the shadow hangs below.
export function lockupBox(k) {
  return {
    w: (MARK.w * WORD_SCALE + LOCKUP_GAP + ROO_CARD_W) * k,
    h: ROO_CARD_H * k,
    shadow: ROO_CARD_SHADOW_DY * k,
  };
}

// The lockup at integer multiplier k with its top-left (the wordmark's cap
// line, and the card's top edge) at x,y. Returns SVG lines for a frame to wrap.
export function lockupSvg({ k, x, y }) {
  if (!Number.isInteger(k) || k < 1) throw new Error(`feature-graphic: lockup multiplier must be a positive integer, got ${k}`);
  const wordScale = WORD_SCALE * k;
  const statScale = STAT_SCALE * k;
  const rooScale = ROO_SCALE * k;
  const cardW = ROO_CARD_W * k;
  const cardH = ROO_CARD_H * k;

  const ruleY = y + MARK.h * wordScale + RULE_GAP * k;
  const cardX = x + MARK.w * wordScale + LOCKUP_GAP * k;
  const rooX = cardX + Math.round((cardW - ROO.w * rooScale) / 2);
  const rooY = y + Math.round((cardH - ROO.h * rooScale) / 2);

  // The stack fills the band the maintainer's round-3 annotation drew: one
  // line-height of air under the rule, last baseline on the card's bottom
  // edge, remaining space split evenly between the lines.
  const lineH = 7 * statScale;
  const statTop = ruleY + RULE_H * k + lineH;
  const statGap = Math.round((y + cardH - statTop - STACK.length * lineH) / (STACK.length - 1));
  const stack = STACK.map((s, i) =>
    `<g transform="translate(${x},${statTop + i * (lineH + statGap)}) scale(${statScale})">${stackLine(s)}</g>`
  );

  return [
    `<g transform="translate(${x},${y}) scale(${wordScale})">${MARK.svg}</g>`,
    `<rect x="${x}" y="${ruleY}" width="${Math.round(MARK.w * wordScale * 0.62)}" height="${RULE_H * k}" fill="${AMBER}"/>`,
    ...stack,
    `<rect x="${cardX}" y="${y + ROO_CARD_SHADOW_DY * k}" width="${cardW}" height="${cardH}" rx="${ROO_CARD_RX * k}" fill="${ROO_CARD_SHADOW}"/>`,
    `<rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="${ROO_CARD_RX * k}" fill="${CREAM}"/>`,
    `<g transform="translate(${rooX},${rooY}) scale(${rooScale})">${ROO.svg}</g>`,
  ];
}

const frameSvg = (w, h, ground, lines) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">
    <rect width="${w}" height="${h}" fill="${ground}"/>
    ${lines.join("\n    ")}
  </svg>`;

export function featureGraphicSvg(ground = RUST) {
  return frameSvg(FEATURE_W, FEATURE_H, ground, lockupSvg({ k: 1, x: PAD, y: WORD_Y }));
}

// The App Store product-page slots. `safe` is the reported art-safe box,
// centred on the frame (see the header for where the figures come from). k=2
// is the largest integer multiplier whose lockup (1632x588) fits the header's
// 1646-wide box, and the search art takes the same lockup so the two read as
// one asset family.
export const APP_STORE_SLOTS = {
  header: { file: "ios-appstore-header-3840x1646.png", w: 3840, h: 1646, safe: { w: 1646, h: 661 }, k: 2 },
  search: { file: "ios-appstore-search-3840x2560.png", w: 3840, h: 2560, safe: { w: 2168, h: 1030 }, k: 2 },
};

// The lockup's top-left in a slot: centred on the frame, which is also the
// centre of its safe box. The card box is centred; the shadow hangs below it.
export function slotOrigin(slot) {
  const box = lockupBox(slot.k);
  return { x: Math.round((slot.w - box.w) / 2), y: Math.round((slot.h - box.h) / 2) };
}

export function appStoreArtSvg(slot, ground = RUST) {
  return frameSvg(slot.w, slot.h, ground, lockupSvg({ k: slot.k, ...slotOrigin(slot) }));
}

// What the STORE gate asserts about the composition itself, as findings
// (empty = sound). A function rather than a module-scope throw, so importing
// this lib can never crash the gate. Width is compared in glyph units times
// scale, which is the same at every k.
export function lockupFindings() {
  const findings = [];
  const column = MARK.w * WORD_SCALE;
  for (const s of STACK) {
    const line = `${s.lead} ${s.words}`;
    let w;
    try {
      w = (word(s.lead, CREAM).w + 5 + word(s.words, STAT_SOFT).w) * STAT_SCALE;
    } catch (e) {
      findings.push(`lib/feature-graphic.mjs: STORE_LINE "${line}" cannot be set: ${e.message}`);
      continue;
    }
    if (w > column) findings.push(`lib/feature-graphic.mjs: stack line "${line}" is ${w}px at Play scale, wider than the ${column}px wordmark column, so it runs into the card`);
  }
  for (const [id, slot] of Object.entries(APP_STORE_SLOTS)) {
    const box = lockupBox(slot.k);
    const { x, y } = slotOrigin(slot);
    const safeX = (slot.w - slot.safe.w) / 2;
    const safeY = (slot.h - slot.safe.h) / 2;
    const inside = x >= safeX && y >= safeY && x + box.w <= safeX + slot.safe.w && y + box.h + box.shadow <= safeY + slot.safe.h;
    if (!inside) findings.push(`lib/feature-graphic.mjs: the ${id} lockup (${box.w}x${box.h + box.shadow} at ${x},${y}) leaves its ${slot.safe.w}x${slot.safe.h} safe box`);
  }
  return findings;
}
