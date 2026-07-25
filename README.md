# Kangentic Branding

Single source of truth for the Kangentic brand assets - the icon, the
mascot, and the social image - consumed by the website (kangentic.com),
the desktop app, and the mobile app. Assets change here, a release ships,
consumers update. Never edit an asset inside a consumer repo.

Published as [`@kangentic/branding`](https://www.npmjs.com/package/@kangentic/branding).

## What's here

- **The mark** - `assets/brandmark*.svg`. A two-tier system: the card-K
  (the letter) where the mark shows large, the F4k board glyph where the
  OS shows it small. Tier is keyed to displayed size, not raster
  resolution. For in-app chrome the consumer themes, two `currentColor`
  variants tint with the surface's foreground when inlined (or used as a
  CSS mask): `brandmark-mono-amber.svg` (theme-tinted disc, amber card
  kept - the default themed lockup) and `brandmark-mono.svg` (pure
  single color, all shape as alpha - strict monochrome, tray-template
  source).
- **The mascot** - `assets/mascot/overseer.svg`. The Overseer, a pixel-art
  amber blob, authored as an ASCII map and rendered to a crisp SVG.
  Nine animation pose frames ship alongside it (blink, wave, wave-left,
  arms-up, look, and the running/step frames); every frame shares the
  `0 0 18 12` viewBox and overlays pixel-perfectly.
- **The animation contract** - `assets/mascot/animations.json` and
  `assets/mascot/animations.css`. The named sequences and their timings live
  here so consumers stop re-deriving them. See "Animating the mascot" below.
- **The production tree** - `resources/`. Everything each surface ships:
  `desktop/` (Electron .ico/.icns + PNG ladder), `web/` (favicons,
  manifest icons, logo), `mobile/` (store + adaptive icons), and
  `social/og-image.png`. See `resources/README.md` for the per-file table.

`assets/` is the vector home (consumer-agnostic SVGs); `resources/` holds
the shipped per-consumer files, mostly rasters for surfaces that cannot
take an SVG. The `resources/web/brandmark*.svg` files are byte copies of
the `assets/` ones so the website deploys a single folder.

Older brand lines and rejected explorations are frozen under `archive/`.

## Use it

```bash
npm install @kangentic/branding
```

Copy or import from
`node_modules/@kangentic/branding/{assets,resources}/`. A git submodule
also works for consumers that can't take an npm dependency.

## Animating the mascot

**See them all: [exploration/mascot/MOTION.md](exploration/mascot/MOTION.md)** -
every sequence as a looping GIF, viewable right here on GitHub, with its timings.
For the interactive version at real display sizes, open
`exploration/mascot/animation-preview.html` in a browser. Both are generated from
the same declaration as the shipped files, so neither can drift.

The mascot's motion is part of the brand, so the sequences ship here rather
than being rebuilt in each app. Two representations, generated from one
declaration, so nothing drifts:

- **`assets/mascot/animations.json`** - framework-agnostic data. Works in any
  runtime, including React Native where there is no CSS.
- **`assets/mascot/animations.css`** - a drop-in stepped frame swap for any
  browser or Electron surface.

Stack one frame per pose, give the container a width, and set the sequence:

```html
<link rel="stylesheet" href="…/assets/mascot/animations.css">

<div class="overseer overseer--blink-loop" role="img"
     aria-label="Pixel-art Kangentic mascot" style="width: 90px">
  <div class="overseer-frame overseer-frame--rest"  aria-hidden="true"><!-- overseer.svg --></div>
  <div class="overseer-frame overseer-frame--blink" aria-hidden="true"><!-- overseer-blink.svg --></div>
</div>
```

The container carries the accessible name; the frames are `aria-hidden` so it
reads as one image. The sequences:

| Sequence | Name | Use |
|---|---|---|
| `none` | no animation | the default, and the reduced-motion rendering |
| `blink-loop` | blinking | idle life. Wants a scheduler: see the randomisation note below |
| `wave-once` | single arm wave | a greeting, or the payoff when a connection lands |
| `double-arm-wave-once` | double arm wave | both arms together. Urgent: "over here", not "hello" |
| `double-arm-alternating-wave-once` | double arm alternating wave | arms pumping alternately. Playful where the double arm wave is urgent |
| `looking-left-and-right-loop` | looking left and right | scanning for something that has not arrived. The base wait idle |
| `running-loop` | running | legs cycling on the spot |
| `waiting-loop` | waiting | runs continuously while glancing left and right. For a wait that runs long |

Each frame div only needs to exist for the frames its sequence names (check
`animations.json`); a sequence never touches a frame it did not declare.

Rules worth knowing before you build your own player:

- **Exactly one frame is visible at a time.** Some poses *vacate* pixels the
  rest frame paints (the wave's arm leaves its row), so a pose layered over the
  rest frame lets the lowered arm bleed through. Each frame's `compositing`
  field records this; the shipped CSS sidesteps it entirely.
- **Stepped, never tweened.** Only `visibility` animates, with `step-end`.
  Pixels hop; they do not glide, and nothing blurs them.
- **Reduced motion is a rendering, not a mute button.** Every sequence rests on
  the canonical frame. The CSS handles it; a custom player must too.
- **CSS cannot randomize**, so a looping sequence runs at the mean of its
  `idle` range. If you have a scheduler, read `animations.json` and draw from
  `idle` (a `square` bias means `min + (max - min) * rand^2`, the right-skew
  that makes blinking read as human rather than as a metronome) and honour
  `repeat` for the occasional double blink.
- **Display at integer multiples of the 18x12 grid only.** Fractional scaling
  blurs the pixels.

## Regenerate

Assets are generated and committed - never hand-edit one. To change an
asset, edit the generator and rerun:

```bash
npm install
npm run gen          # canonical assets/ + exploration sheets
npm run gen:icons    # production icon tree -> resources/
npm run gen:sprites  # mascot -> assets/mascot/
npm run gen:og       # social image -> resources/social/
```

All mark geometry lives in `scripts/lib/mark.mjs` (the K is frozen path
data, so there's no font dependency at render time). Generators are
deterministic; the release pipeline fails if committed output drifts.

## Release

`/release [patch|minor|major]` in Claude Code handles the determinism
gate, version bump, changelog, tag, GitHub release, and npm publish. The
package major tracks the brand generation (v1 blue K, v2 Warm Craft); a
major bump archives the outgoing line first.

## Deeper docs

The full mark rationale, geometry, and decision history live in the
project's Claude Code skills (`icon-drafting`, `sprite-drafting`,
`design-language`).
