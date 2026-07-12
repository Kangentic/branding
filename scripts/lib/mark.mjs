// lib/mark.mjs - the canonical Kangentic mark geometry. Every generator
// imports from here; no other file may re-declare these constants. The K is
// FROZEN path data (Microsoft Tai Le Bold, extracted once via WPF
// FormattedText.BuildGeometry at em=100) so renders are deterministic and
// exported SVGs are portable - no installed-font dependency anywhere.

export const CREAM = "#fdfbf7";
export const INK = "#24201b";
export const RUST = "#c0562f";
export const AMBER = "#e8a33d";

export const K_PATH =
  "M8.0078125,22.70380401611328L23.779296875,22.70380401611328 23.779296875,55.80927276611328 24.0234375,55.80927276611328 24.365232467651367,55.05243682861328 24.804685592651367,54.14911651611328 25.341794967651367,53.09931182861328 25.9765625,51.90302276611328 45.3125,22.70380401611328 64.111328125,22.70380401611328 39.697265625,56.10224151611328 66.2109375,92.72333526611328 46.2890625,92.72333526611328 25.87890625,62.30341339111328 25.543212890625,61.73273468017578 25.1220703125,60.89960479736328 24.615478515625,59.80402374267578 24.0234375,58.44599151611328 23.779296875,58.44599151611328 23.779296875,92.72333526611328 8.0078125,92.72333526611328 8.0078125,22.70380401611328z";
export const K_B = { x: 8.0078125, y: 22.70380401611328, w: 58.203125, h: 70.01953125 };
export const K_SIZE = 79; // em size in the 100-box
export const K_BASE = 79; // baseline y
export const K_BASELINE_IN_EM = 92.72333526611328; // ink bottom = baseline for K

// The frozen glyph rendered into the 100-box: font-size 79, baseline y=79,
// centered on x=50.
export function fontK(fill, s = 1) {
  const k = K_SIZE / 100;
  const tx = 50 - k * (K_B.x + K_B.w / 2);
  const ty = K_BASE - k * K_BASELINE_IN_EM;
  return `<g transform="translate(${tx * s},${ty * s}) scale(${k * s})"><path d="${K_PATH}" fill="${fill}"/></g>`;
}
// Back-compat alias used by older disc()/mark() callers.
export function geoK(fill, size) {
  return fontK(fill, size / 100);
}

// fontK() output bbox in the 100-box.
export const K_GLYPH_BOX = (() => {
  const k = K_SIZE / 100;
  const tx = 50 - k * (K_B.x + K_B.w / 2);
  const ty = K_BASE - k * K_BASELINE_IN_EM;
  return { x: tx + k * K_B.x, y: ty + k * K_B.y, w: k * K_B.w, h: k * K_B.h };
})();

// Half-plane quad for clip paths: covers side>0 or side<0 of the line
// through (cx,cy) with unit normal (dx,dy). Coordinates in the 100-box*s.
export function halfplane(cx, cy, dx, dy, side, s = 1) {
  const vx = -dy, vy = dx;
  const L = 400;
  const pts = [
    [cx - vx * L, cy - vy * L],
    [cx + vx * L, cy + vy * L],
    [cx + vx * L + side * dx * L, cy + vy * L + side * dy * L],
    [cx - vx * L + side * dx * L, cy - vy * L + side * dy * L],
  ];
  return pts.map(([x, y]) => `${x * s},${y * s}`).join(" ");
}

// The split K (severed amber arm-tip), built paint-erase-overpaint so the
// cut can sit anywhere on the arm without clipping the stem. Size-specific
// cuts: CANON for large display, SMALL with tip + gap exaggerated so the
// split survives small rasters.
export const ARM_A = 38;
export const ARM_D = { x: Math.cos((ARM_A * Math.PI) / 180), y: -Math.sin((ARM_A * Math.PI) / 180) };
export const CUT_CANON = { cx: 55.75, cy: 38.9, gap: 4.5 };
export const CUT_SMALL = { cx: 52.6, cy: 41.4, gap: 6.5 };
// Card-K rasters keep the exaggerated cut until the mark is big enough for
// the refined one.
export const cutFor = (sizePx) => (sizePx < 128 ? CUT_SMALL : CUT_CANON);

let clipSeq = 0;
// The gap band: a thin rect across the arm, rotated to the arm angle.
export function bandRect(fill, s = 1, P = CUT_CANON) {
  return `<rect x="${(P.cx - P.gap / 2) * s}" y="${(P.cy - 13) * s}" width="${P.gap * s}" height="${26 * s}" transform="rotate(${-ARM_A} ${P.cx * s} ${P.cy * s})" fill="${fill}"/>`;
}
// Full K with the gap erased via its own mask (background-agnostic).
export function kWithGap(fill, s = 1, P = CUT_CANON) {
  const id = `kg${clipSeq++}`;
  return `<mask id="${id}"><rect x="${-50 * s}" y="${-50 * s}" width="${200 * s}" height="${200 * s}" fill="#fff"/>${bandRect("#000", s, P)}</mask>
    <g mask="url(#${id})">${fontK(fill, s)}</g>`;
}
// The severed arm-end alone (everything past the gap along the arm).
export function tipClipped(fill, s = 1, P = CUT_CANON) {
  const id = `kt${clipSeq++}`;
  const c2x = P.cx + (P.gap / 2) * ARM_D.x;
  const c2y = P.cy + (P.gap / 2) * ARM_D.y;
  return `<clipPath id="${id}"><polygon points="${halfplane(c2x, c2y, ARM_D.x, ARM_D.y, 1, s)}"/></clipPath>
    <g clip-path="url(#${id})">${fontK(fill, s)}</g>`;
}
// The split K: body in kFill, severed arm-end in tipFill.
export function fontKSplit(kFill, tipFill, s = 1, P = CUT_CANON) {
  return kWithGap(kFill, s, P) + tipClipped(tipFill, s, P);
}

// Disc-context enlargement used by the legacy exploration rounds.
export const enlarged = (svg) => `<g transform="translate(-9,-9) scale(1.18)">${svg}</g>`;

// ---------------------------------------------------------------------------
// TIER 1 (>=48px): the card-K. The card window is DERIVED from the glyph
// bbox plus an even CARD_MARGIN, slightly portrait, auto-scaled so the card
// corners sit CARD_RING units inside the disc. Never size the card
// independently of the glyph; change CARD_MARGIN instead.
// ---------------------------------------------------------------------------
export const CARD_MARGIN = 5;
export const CARD_RING = 6; // rust ring at the card corners, 100-box units
export const CARD_RX = 7.5; // pre-scale corner radius

export function tightCardK(margin = CARD_MARGIN, P = CUT_CANON, kFill = RUST) {
  const g = K_GLYPH_BOX;
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;
  const hw = g.w / 2 + margin;
  const hh = g.h / 2 + margin;
  const d = Math.hypot(hw - CARD_RX, hh - CARD_RX) + CARD_RX;
  const q = (50 - CARD_RING) / d;
  const wrap = (svg) => `<g transform="translate(50,50) scale(${q}) translate(${-cx},${-cy})">${svg}</g>`;
  const rect = (fill) =>
    `<rect x="${cx - hw}" y="${cy - hh}" width="${2 * hw}" height="${2 * hh}" rx="${CARD_RX}" fill="${fill}"/>`;
  return {
    hole: wrap(rect("#000")),
    filled: wrap(fontKSplit(kFill, AMBER, 1, P)),
    filledCard: wrap(rect(CREAM) + fontKSplit(kFill, AMBER, 1, P)),
  };
}

// ---------------------------------------------------------------------------
// TIER 2 (<48px): the F4k board glyph. Letterless - three column holes
// through the rust disc, amber card mid-drop. Won the live in-header review
// at 24-26px against every K letterform (Tyler, 2026-07-12).
// ---------------------------------------------------------------------------
export function f4kParts() {
  return {
    holes: enlarged(`<rect x="27" y="25" width="12.5" height="44" rx="3" fill="#000"/>
            <rect x="43.5" y="25" width="12.5" height="24" rx="3" fill="#000"/>
            <rect x="60" y="25" width="12.5" height="44" rx="3" fill="#000"/>`),
    filled: enlarged(`<rect x="43.5" y="55" width="12.5" height="14" rx="3" fill="${AMBER}"/>`),
  };
}

// The K-hole disc (small-tier runner-up, kept viable) and cream-K filled.
export const K_DISC_CLEAR = 5; // rust ring outside the glyph bbox corners
export const kOnDisc = (() => {
  const g = K_GLYPH_BOX;
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;
  const q = (50 - K_DISC_CLEAR) / Math.hypot(g.w / 2, g.h / 2);
  return (svg) => `<g transform="translate(50,50) scale(${q}) translate(${-cx},${-cy})">${svg}</g>`;
})();

// The tier picker for rasters: F4k below 48px, card-K from 48 up.
export function partsFor(sizePx) {
  return sizePx < 48 ? f4kParts() : (({ hole, filled }) => ({ holes: hole, filled }))(tightCardK(CARD_MARGIN, cutFor(sizePx)));
}

// ---------------------------------------------------------------------------
// Document builders
// ---------------------------------------------------------------------------
// Knockout disc: rust circle with true alpha holes (theme/wallpaper flows
// through), filled overlays on top. holes must paint fill="#000".
export function knockout(size, holes100, filled100) {
  const c = size / 2;
  const s = size / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><mask id="m">
      <circle cx="${c}" cy="${c}" r="${c}" fill="#fff"/>
      <g transform="scale(${s})">${holes100}</g>
    </mask></defs>
    <circle cx="${c}" cy="${c}" r="${c}" fill="${RUST}" mask="url(#m)"/>
    <g transform="scale(${s})">${filled100}</g>
  </svg>`;
}

// Knockout disc centered on a full-bleed opaque square (iOS/store surfaces
// reject alpha; the holes reveal the square's ground instead of the theme).
// discFrac = disc diameter as a fraction of the square edge.
export function discOnSquare(size, discFrac, ground, { holes, filled }) {
  const d = size * discFrac;
  const off = (size - d) / 2;
  const c = d / 2;
  const s = d / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${ground}"/>
    <g transform="translate(${off},${off})">
      <defs><mask id="m">
        <circle cx="${c}" cy="${c}" r="${c}" fill="#fff"/>
        <g transform="scale(${s})">${holes}</g>
      </mask></defs>
      <circle cx="${c}" cy="${c}" r="${c}" fill="${RUST}" mask="url(#m)"/>
      <g transform="scale(${s})">${filled}</g>
    </g>
  </svg>`;
}
