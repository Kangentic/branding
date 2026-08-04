// lib/feature-graphic.mjs - THE Play Store feature graphic composition
// (1024x500), declared once so the generator and the review sheet cannot
// drift. gen-icons.mjs writes the shipped asset from it; gen-review.mjs
// renders ground candidates from the same function.
//
// Constraints this layout answers, from Google Play's own preview-assets
// spec: the asset is REQUIRED to publish on every track beyond internal
// testing, it must carry no alpha channel, Play crops it in some placements,
// and Play warns off pure white / black / dark grey grounds. Hence a
// saturated brand-rust ground, a 104px inset on everything (just over 10%,
// clear of the edge cutoff zones), and NO full-bleed edge bar (the social
// image's rust bar at x=0 would be the first thing cropped).
//
// Layout, settled 2026-08-03 across three annotated maintainer rounds: two
// columns on one grid. Left, the cream wordmark, the amber rule, and a
// three-line proof STACK; right, the Overseer on a cream card. The card top
// sits ON the wordmark cap line and the card bottom ON the stack's last
// baseline - those two shared edges are what make the lockup settle, and the
// first round's finding was exactly their absence (an 8px near-miss at the
// top, an 8px rub at the bottom).
//
// The stack replaced the 2.7.1 bottom-run proof line, and the correction of
// record: that layout's rationale said a side-by-side proof line "forces
// 14px", which was true only of a ONE-line tag. Three stacked lines clear
// the card horizontally at 35px each, taller than the bottom run's 21px ever
// was. The stack derives from PROOF_LINE (split on " / "), so this surface
// and the social image cannot disagree on the copy. Each stat leads with its
// numeral in cream and lets the words step back to a soft warm cream: the
// numbers are the proof.
//
// The wordmark comes from lib/pixelfont.mjs and the Overseer from
// lib/sprite.mjs at an INTEGER scale, so there is no font dependency and the
// pixels stay crisp.

import { RUST, CREAM, AMBER } from "./mark.mjs";
import { OVERSEER, rects as spriteRects, PALETTE } from "./sprite.mjs";
import { word, PROOF_LINE } from "./pixelfont.mjs";

export const FEATURE_W = 1024;
export const FEATURE_H = 500;

// PAD is just over 10% of the width on purpose. Play crops this asset in
// some placements and warns against key elements (logo, app name, slogan)
// sitting in the edge cutoff zones, so nothing here starts inside 10%.
const PAD = 104;
const WORD_SCALE = 8; // 7px glyphs -> 56px cream wordmark
const WORD_Y = 108;
const RULE_H = 10;
const RULE_GAP = 30;
const STAT_SCALE = 5; // 7px glyphs -> 35px stat lines
// The Overseer's card (ROO_ prefix: "card" alone already names the brandmark
// card in lib/mark.mjs, and the single-source gate rightly rejects reusing
// those constant names).
const ROO_CARD_W = 344;
const ROO_CARD_H = 294;
const ROO_CARD_Y = WORD_Y; // card top ON the wordmark cap line
const ROO_CARD_RX = 14;
// The crisp offset shadow, straight down like every card in the system
// (box-shadow 0 2px 0 at UI scale) - never a blur.
const ROO_CARD_SHADOW_DY = 6;
const ROO_CARD_SHADOW = "rgba(36,32,27,0.28)";
const ROO_SCALE = 16; // 18x12 grid -> 288x192, integer only
const STAT_SOFT = "#e9c9b8"; // the stat words; cream numerals lead

// The three stats ARE the proof line, split at its separators. Derived, not
// retyped, so the copy cannot drift between this surface and the social
// image. Each stat's first token is its numeral ("12", "100%", "$0").
const STATS = PROOF_LINE.split(" / ").map((stat) => {
  const [num, ...words] = stat.split(" ");
  return { num, words: words.join(" ") };
});

// One stat line: numeral in cream, words in soft cream, joined at word()'s
// own space advance (trailing letterspace + 4-unit space = 5).
const statLine = ({ num, words }) => {
  const n = word(num, CREAM);
  const w = word(words, STAT_SOFT);
  return `${n.svg}<g transform="translate(${n.w + 5},0)">${w.svg}</g>`;
};

export function featureGraphicSvg(ground = RUST) {
  const mark = word("KANGENTIC", CREAM);
  const roo = spriteRects(OVERSEER, { unit: 1, palette: PALETTE });

  const ruleY = WORD_Y + mark.h * WORD_SCALE + RULE_GAP;
  const cardX = FEATURE_W - ROO_CARD_W - PAD;
  const rooX = cardX + Math.round((ROO_CARD_W - roo.w * ROO_SCALE) / 2);
  const rooY = ROO_CARD_Y + Math.round((ROO_CARD_H - roo.h * ROO_SCALE) / 2);

  // The stack fills the band the maintainer's round-3 annotation drew: one
  // line-height of air under the rule, last baseline on the card's bottom
  // edge, remaining space split evenly between the lines.
  const lineH = 7 * STAT_SCALE;
  const statTop = ruleY + RULE_H + lineH;
  const statGap = Math.round((ROO_CARD_Y + ROO_CARD_H - statTop - 3 * lineH) / 2);
  const stack = STATS.map((s, i) =>
    `<g transform="translate(${PAD},${statTop + i * (lineH + statGap)}) scale(${STAT_SCALE})">${statLine(s)}</g>`
  ).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FEATURE_W}" height="${FEATURE_H}" viewBox="0 0 ${FEATURE_W} ${FEATURE_H}" shape-rendering="crispEdges">
    <rect width="${FEATURE_W}" height="${FEATURE_H}" fill="${ground}"/>
    <g transform="translate(${PAD},${WORD_Y}) scale(${WORD_SCALE})">${mark.svg}</g>
    <rect x="${PAD}" y="${ruleY}" width="${Math.round(mark.w * WORD_SCALE * 0.62)}" height="${RULE_H}" fill="${AMBER}"/>
    ${stack}
    <rect x="${cardX}" y="${ROO_CARD_Y + ROO_CARD_SHADOW_DY}" width="${ROO_CARD_W}" height="${ROO_CARD_H}" rx="${ROO_CARD_RX}" fill="${ROO_CARD_SHADOW}"/>
    <rect x="${cardX}" y="${ROO_CARD_Y}" width="${ROO_CARD_W}" height="${ROO_CARD_H}" rx="${ROO_CARD_RX}" fill="${CREAM}"/>
    <g transform="translate(${rooX},${rooY}) scale(${ROO_SCALE})">${roo.svg}</g>
  </svg>`;
}
