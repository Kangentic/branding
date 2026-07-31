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
- **The UI glyphs** - `assets/ui/*.svg`. The navigation marks, `currentColor`
  on the same 24 grid as the activity set. `kanban.svg` is the Board mark, and
  it exists because SF Symbols ships no kanban glyph. See "UI icons" below.
- **The production tree** - `resources/`. Everything each surface ships:
  `desktop/` (Electron .ico/.icns + PNG ladder), `web/` (favicons,
  manifest icons, logo), `mobile/` (every OS-owned and store-facing asset
  Expo needs: app icons including the iOS dark/tinted variants, adaptive
  and Android 13+ themed layers, the notification icon, the splash mark,
  the Play feature graphic, and the iOS Board tab rasters), and
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

Mount one frame div for every name in that sequence's **`mountFrames`** in
`animations.json`. That is not the same as the frames its `clip` plays: a
sequence also rests on `restFrame` when it ends and under reduced motion, even
when the clip never names it. `running-loop` plays `step-a` and `step-b` but
mounts `step-a`, `step-b` and `rest`, and mounting only the played pair renders
nothing at all once motion is off. `clip` is what to play; `mountFrames` is what
to mount.

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

## Activity icons

`assets/activity/` holds the agent, Command Terminal and pause/stop status
marks this package owns for the desktop app, the mobile app and the website to
render in-app. Nine marks, four silhouettes, on one 24 grid with an 18-unit
layout slot and a 2px stroke. The slot fixes WIDTH; each form takes the height
it needs, so the ring and the chip fill 18x18 and the envelope is 18x16.

```
agent-idle              envelope        needs you, static
agent-working           ring            working, marching
terminal-idle           prompt chip     needs you, static
terminal-working        prompt chip     working, marching
terminal-new            plus chip       the new-terminal action
control-pause-idle      ring + bars     needs you, static
control-pause-working   ring + bars     working, marching
control-stop-idle       ring + square   needs you, static
control-stop-working    ring + square   working, marching
```

Every mark is `currentColor`, so **you apply your own tokens**. Do not hardcode
a hex: the three consumers deliberately differ (desktop `#34d399`/`#e3b341`,
mobile `#3ddc84`/`#d9b83f`, web `#218a4c`/`#d98324`).

**Why they differ, since "deliberately" invites the question (measured
2026-07-30): ground luminance forces it.** Desktop and mobile paint on near-black
(`#211c19`, `#0f0d0a`); the website paints on cream (`#fdfbf7`). All four
dark-theme values land at **1.73 to 1.88:1 on cream**, far under the 3:1 floor
for non-text, so the website could not adopt them at any price. The website's
darker pair does clear 3:1 on both dark grounds, but at roughly half the contrast
the native values reach (3.86 to 6.67 against 8.67 to 10.87), and these are 2px
strokes with a 12px legibility floor. Each surface then anchors its values to its
own system: desktop to its Tailwind ramp, mobile to its terminal ANSI palette so
status agrees with terminal output, the website to the `design-language` lamps.

The website itself demonstrates the mechanism: for its own warm-black terminal
ground it carries a separate lifted pair (`--term-green`/`--term-red`) rather than
reusing its cream lamps there, for exactly this reason.
And one hex can mean two different things across surfaces, which is the sharpest
argument for never baking one in: `#d9b83f` is mobile's *attention* amber and the
desktop's *caution* band.

```html
<link rel="stylesheet" href="…/assets/activity/activity.css">
<span style="color: var(--your-working-token)"><!-- agent-working.svg --></span>
```

Rules worth knowing:

- **Pick a mark; never assemble one.** States are named files. Composing a base
  glyph with a tone and an animation class is where three renderings drift
  apart, which is the whole reason this set is owned here.
- **Rest is the `-idle` geometry in a muted tone.** There is no `-rest` file.
- **Two legibility floors: 12px for indicators, 16px for the controls**, whose
  centred glyph gets a fraction of an already small box. Below the floor, draw
  a dot instead of a mark.
- **The marks are pixel-hinted for the 14-16 indicator band.** Every outline
  extremum sits on an integer grid coordinate, which is the sharpest a 24-grid
  stroke-2 set can land at those sizes. Render at a whole CSS pixel size; a
  fractional one (`15.5`, or an icon sized by a flexible container) throws the
  hinting away. The effect is largest at 100% display scaling and shrinks as
  `devicePixelRatio` rises.
- **Motion ships; do not re-author it.** `activity.css` is a drop-in. For a
  runtime with no CSS, read `activity.json`: it carries the same contract as
  data, including each mark's `reducedMotion` rendering.
- **Use `dashUserUnits`, not `dash`, wherever `pathLength` is unreliable.**
  Browsers honour `pathLength`; librsvg and react-native-svg do not, and a ratio
  dash silently falls back to user units there, where a "75" dash covers a
  56-unit circle entirely and the motion disappears.
- **Reduced motion is a rendering, not a mute button.** The spinner rests
  holding its arc; the chip drops its dash entirely, because a frozen 65/35
  outline reads as torn rather than as at rest.

## UI icons

`assets/ui/` holds the NAVIGATION glyphs, as distinct from the status marks
above. Same 24 grid, same 18-unit layout slot, same 2px stroke, so the two sets
sit level in one row - `lib/ui-glyphs.mjs` imports that grid rather than
restating it. No state, no motion.

```
kanban    the board surface (mobile Board tab, desktop and web board nav)
```

It exists because SF Symbols ships no kanban glyph. The catalogue was searched
for `kanban`, `board`, `column` and `lane`; the only `column` hits are
`building.columns`, a bank facade, and the nearest shapes are split rectangles
that read as "split view". Mobile rasterised its own and Android rendered a
different one, which is the three-way drift this package exists to prevent.

Like the activity marks it is `currentColor`, so **you apply your own token**.

```html
<span style="color: var(--your-nav-token)"><!-- assets/ui/kanban.svg --></span>
```

Rules worth knowing:

- **Web and desktop take the SVG. There is no raster for them**, deliberately.
- **iOS takes `resources/mobile/kanban-tab-{25,50,75}.png`** (1x/2x/3x of the
  25pt tab metric), because `UITabBarItem` needs a real `UIImage`. These are
  **template images**: UIKit discards colour and paints the bar's tint through
  the alpha channel. Hand them over as shipped. Compositing one onto a
  background first turns the whole tab slot into a tinted block.
- **The 25pt size and the 2px stroke were chosen for the iOS tab bar.** If
  another surface wants a different optical weight, that is a variant, not a
  replacement: changing these invalidates the store screenshots captured
  against them.
- **`kanban` is not called `board`.** The F4k brandmark is already "the board
  glyph" throughout this repo, and one name for two assets is exactly the
  ambiguity these sets exist to remove.
- `ui.json` carries the same contract as data, including the raster filenames,
  which live under `resources/` and are otherwise undiscoverable from
  `assets/ui/`.

The kanban glyph's proportions follow lucide's `SquareKanban` (ISC). The
geometry is declared as named constants, not vendored as path data; see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Regenerate

Assets are generated and committed - never hand-edit one. To change an
asset, edit the generator and rerun:

```bash
npm install
npm run gen          # canonical assets/ + exploration sheets
npm run gen:icons    # production icon tree -> resources/
npm run gen:sprites  # mascot -> assets/mascot/
npm run gen:og       # social image -> resources/social/
npm run gen:activity # activity marks -> assets/activity/
npm run gen:ui       # ui glyphs -> assets/ui/ + the iOS tab rasters
npm run check        # the mechanical brand-invariant gate
```

All brandmark geometry lives in `scripts/lib/mark.mjs` (the K is frozen path
data, so there's no font dependency at render time), all activity geometry in
`scripts/lib/activity.mjs`, and all ui glyph geometry in
`scripts/lib/ui-glyphs.mjs`. Generators are deterministic; CI reruns them on
every pull request and every push to `main`, and fails if committed output
drifts or if `npm run check` does. The release pipeline reruns both again on
the version tag, before anything is published.

## Release

`/release [patch|minor|major]` in Claude Code handles the determinism
gate, version bump, changelog, tag, GitHub release, and npm publish. The
package major tracks the brand generation (v1 blue K, v2 Warm Craft); a
major bump archives the outgoing line first.

## Deeper docs

The full mark rationale, geometry, and decision history live in the
project's Claude Code skills (`icon-drafting`, `sprite-drafting`,
`design-language`).
