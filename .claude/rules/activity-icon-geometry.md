---
paths:
  - "scripts/**"
  - "assets/activity/**"
---

# Rule: activity icon geometry lives only in scripts/lib/activity.mjs

The activity set is the agent, Command Terminal and pause/stop marks that the
desktop app, the mobile app and the website all render. It exists because those
marks were stock library defaults whose ink boxes disagreed: the loader and the
terminal filled 18x18 but the mail filled 20x16, about 11% wider and 11%
shorter, so a project sidebar row sat unevenly. Aspect differs, so scaling could
not reconcile them - only redrawing could.

The same drift had already started inside the consumers. The working ring's dash
is a hand-computed `47 16` pair, and it is duplicated verbatim in two desktop
files; change the radius and both break silently. That is the failure this set
is owned here to prevent.

## The rule

- All activity geometry is DECLARED once, in `scripts/lib/activity.mjs`. Every
  generator imports from it and declares none of its own.
- **One grid, one stroke, one ink box.** 24 viewBox, 18x18 ink, stroke 2, round
  caps and joins. A mark that does not fill the ink box reintroduces the exact
  misalignment this set removes.
- **`currentColor` only. Never a hex.** The three consumers do not share status
  token values (desktop `#34d399`/`#e3b341`, mobile `#3ddc84`/`#d9b83f`, web
  `#218a4c`/`#d98324`), and a hex in a mark would pick one surface's palette for
  all of them. Tone is the consumer's to apply.
- **States are named marks, never composed.** `agent-idle` and `agent-working`
  are two files; a consumer picks one. It must never assemble a state out of a
  base glyph plus a tone plus an animation class, because that assembly step is
  where three renderings drift apart. Rest is the `-idle` geometry in a muted
  tone, which is why there is no `-rest` mark.
- **Motion ships as data plus CSS and is never re-authored in a consumer.**
  `activity.css` carries the keyframes and durations; `activity.json` carries
  the same contract as framework-agnostic data for runtimes with no CSS. A
  consumer reads those; it never hardcodes a duration or a dash.
- **Every dash ships in both forms.** Browsers honour `pathLength`, but librsvg
  and react-native-svg do not reliably, and a ratio dash silently falls back to
  user units there - where a "75" dash covers a 56-unit circle entirely and the
  motion disappears. The manifest carries `dash` and `dashUserUnits` for every
  mark that has one.
- **No animation fill mode.** The desktop's animations-off setting zeroes
  `animation-duration`, and a filled zero-duration animation snaps to its 100%
  keyframe instead of resting on the canonical frame.
- **Two legibility floors.** Indicators bottom out at 12px, where a 2px stroke
  on a 24 grid falls under one device pixel. Controls bottom out at 16px,
  because their centred glyph gets a fraction of an already small box. Below a
  floor, a consumer uses a dot, not a mark.
- Iterate in named constants (`INK_BOX`, `R_CHIP`, `FLAP_VARIANTS`,
  `DASH_SPINNER`), never ad-hoc numbers at a call site. A rejected candidate
  keeps its `draft` flag and its dated reason rather than being deleted.

## Enforcement (self-maintaining)

- **Gate (blocking):** `npm run check`'s `ACTIVITY` check. It globs
  `assets/activity/*.svg` rather than enumerating them, so a new mark cannot be
  invisible to it, and its strongest assertion is behavioural: the shipped SVG
  bytes, `activity.css` and `activity.json` must equal what `lib/activity.mjs`
  produces, so a hand-edit or a stale commit fails there rather than at the next
  regeneration. It also enforces the grid, `currentColor`, the dash pair, the
  declared reduced-motion rendering, the fill-mode ban, and that no file outside
  the lib re-declares a named geometry constant.
- **Release gate (blocking):** `npm run gen:activity` runs in the determinism
  gate alongside the other generators.

## Scope

`scripts/**` and `assets/activity/**`. This is a THIRD visual vocabulary,
distinct from the brandmark (`lib/mark.mjs`, knockout-disc geometry) and the
mascot (`lib/sprite.mjs`, pixel-art rect grids). The pixel-art rule's ban on
freehand `<path>` governs sprites, not these: a stroked UI affordance glyph is
not illustration. Review artifacts under `exploration/activity/` are exempt from
byte determinism.
