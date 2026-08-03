// lib/feature-graphic.mjs - THE Play Store feature graphic composition
// (1024x500), declared once so the generator and the review sheet cannot
// drift. gen-icons.mjs writes the shipped asset from it; gen-review.mjs
// renders ground candidates from the same function.
//
// Constraints this layout answers, from Google Play's own preview-assets
// spec: the asset is REQUIRED to publish on every track beyond internal
// testing, it must carry no alpha channel, Play crops it in some placements,
// and Play warns off pure white / black / dark grey grounds. Hence the panel
// tint rather than near-white cream, a 64px inset on everything, and NO
// full-bleed edge bar (the social image's rust bar at x=0 would be the first
// thing cropped).
//
// The wordmark comes from lib/pixelfont.mjs and the Overseer from
// lib/sprite.mjs at an INTEGER scale, so there is no font dependency and the
// pixels stay crisp.

import { PANEL, RUST, INK, INK_SOFT } from "./mark.mjs";
import { OVERSEER, rects as spriteRects, PALETTE } from "./sprite.mjs";
import { PROOF_LINE, word } from "./pixelfont.mjs";

export const FEATURE_W = 1024;
export const FEATURE_H = 500;

// Layout: wordmark + rule top-left with the Overseer beside it, and the proof
// line along the bottom. The proof line runs WIDER than the wordmark column,
// so it clears the mascot vertically rather than horizontally - that is what
// buys it a legible 21px instead of the 14px a side-by-side layout forces.
// PAD is just over 10% of the width on purpose. Play crops this asset in some
// placements and warns against key elements (logo, app name, slogan) sitting
// in the edge cutoff zones, so nothing here starts inside 10%.
const PAD = 104;
const WORD_SCALE = 8; // 7px glyphs -> 56px
const TAG_SCALE = 3; // 7px glyphs -> 21px proof line
const ROO_SCALE = 19; // 18x12 grid -> 342x228, integer only
const RULE_H = 10;
const WORD_Y = 108;
const RULE_GAP = 30;
const TAG_Y = 392;
const ROO_RIGHT = 104;

export function featureGraphicSvg(ground = PANEL) {
  const mark = word("KANGENTIC", INK);
  const tag = word(PROOF_LINE, INK_SOFT);
  const roo = spriteRects(OVERSEER, { unit: 1, palette: PALETTE });

  const ruleY = WORD_Y + mark.h * WORD_SCALE + RULE_GAP;
  const rooX = FEATURE_W - roo.w * ROO_SCALE - ROO_RIGHT;
  const rooY = Math.round((FEATURE_H - roo.h * ROO_SCALE) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FEATURE_W}" height="${FEATURE_H}" viewBox="0 0 ${FEATURE_W} ${FEATURE_H}" shape-rendering="crispEdges">
    <rect width="${FEATURE_W}" height="${FEATURE_H}" fill="${ground}"/>
    <g transform="translate(${PAD},${WORD_Y}) scale(${WORD_SCALE})">${mark.svg}</g>
    <rect x="${PAD}" y="${ruleY}" width="${Math.round(mark.w * WORD_SCALE * 0.62)}" height="${RULE_H}" fill="${RUST}"/>
    <g transform="translate(${PAD},${TAG_Y}) scale(${TAG_SCALE})">${tag.svg}</g>
    <g transform="translate(${rooX},${rooY}) scale(${ROO_SCALE})">${roo.svg}</g>
  </svg>`;
}
