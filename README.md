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
- **The demo pointer** - `assets/pointer/`. The dot that stands in for a mouse
  over a scripted demo (kangentic.com's hero, the app's web demo), the ring a
  press leaves, and the click as data in `pointer.json`. See "The demo pointer"
  below.
- **The priority meter** - `assets/priority/`. The equal bars a task's priority
  draws, as a rule for any scale length in `meter.json` plus reference SVGs for
  the default scale. See "The priority meter" below.
- **The production tree** - `resources/`. Everything each surface ships:
  `desktop/` (Electron .ico/.icns + PNG ladder), `web/` (favicons,
  manifest icons, logo), `mobile/` (every OS-owned and store-facing asset
  Expo needs: app icons including the iOS dark/tinted variants, adaptive
  and Android 13+ themed layers, the notification icon, the splash mark,
  the store art, and the iOS Board tab rasters), and `social/og-image.png`.
  The store art is the Play feature graphic plus the App Store product-page
  header and search images, all set from one lockup. See
  `resources/README.md` for the per-file table.

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
render in-app. Twelve marks over eight silhouettes (as `activity.json` counts
them, the pause and stop rings separately), on one 24 grid with an 18-unit
layout slot and a 2px stroke. The slot fixes WIDTH; each form takes the height
it needs, so the ring, the chip and the flag fill 18x18, the envelope is 18x16,
the speech bubble is an 18x14 body with a tail that brings it to 18 tall, and
the shield is 18x20, overshooting the slot by a unit at its peak and its point,
with two opposite quarters solid.

```
agent-idle              envelope        turn finished; the idle count, static
agent-working           ring            working, spinning
agent-question          speech bubble   has a question, static
agent-approval          shield          needs your approval, static
agent-stopped           flag            stopped, needs you, static
terminal-idle           prompt chip     needs you, static
terminal-working        prompt chip     working, prompt blinking
terminal-new            plus chip       the new-terminal action
control-pause-idle      ring + bars     needs you, static
control-pause-working   ring + bars     working, spinning
control-stop-idle       ring + square   needs you, static
control-stop-working    ring + square   working, spinning
```

An idle agent has four amber marks, and their shape is the only difference
between them, so each one has to hold at the 12px floor:

- `agent-question`, the bubble: a pick-an-option question is waiting.
- `agent-approval`, the quartered shield: a tool approval prompt, or a plan
  waiting to be approved.
- `agent-stopped`, the flag: the agent finished and the board will not move the
  card until a person acts. An automation spent its run limit, or a review step
  is one only a person can do. Nothing went wrong, so it is not a failure mark.
  The flag says look here, so pair it with a tip that says why the board
  stopped.
- `agent-idle`, the envelope: the turn finished and nothing is pending.

A wait whose kind the agent does not report takes the bubble.

The envelope is also the COUNTING mark. A surface that counts agents rather
than showing one (a sidebar row, a monitor summary) keeps a single idle count
drawn with `agent-idle`, covering all four kinds, beside the working count.
Mail means "there is something for you", which is what that count says; the
bubble, the shield and the flag are for surfaces that show one agent, where the
kind is worth knowing. Until you adopt a mark, `agent-idle` still covers its
state everywhere, exactly as it did before.

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

## The demo pointer

`assets/pointer/` holds the dot kangentic.com's hero clicks with and the app's
web demo walks through its scenes, so a visitor sees one pointer across the
site. It is drawn in **page pixels**, tinted through `currentColor`, and its
click ships as data. Where the pointer goes and when stays with each consumer:
the hero's eight-second beat, the demo's travel, drags, press length and
double-click gap.

```
pointer.svg       the dot: an 8px core and an 18px halo (no aura), parts named
                  core, halo, halo-fill, halo-edge
pointer-ring.svg  the ring one press leaves: a 1.5px hairline out to 72px
pointer.json      units, tones, states, the click tracks, events
```

Rules worth knowing:

- **Tint it cream over a dark ground, ink over a light one.** The svg carries
  cream's halo weights (20% fill, 40% edge). For ink, set
  `[data-part=halo-fill] { fill-opacity: .16 }` and
  `[data-part=halo-edge] { stroke-opacity: .45 }`, from `tones.ink`. A consumer
  that picks the tone itself follows `tones.rule`: cream below a ground
  luminance of 0.4, crossfaded over 120ms.
- **A frame shown at scale `s` divides by `s`.** Every length is page px at
  `s = 1`. Size each svg at its `box / s`, and set the ring circle's
  `stroke-width` to `1.5 / s`: it is `non-scaling-stroke`, so sizing the svg
  does not carry it along.
- **A press is a state plus three tracks. A release is a state alone.** On a
  press, set the core to `states.pressed` (no tween, held until the release),
  play `motion.pop` on the halo, and clone the ring svg at the press point and
  play `motion.ringGrow` and `motion.ringFade` on its circle. On a release, set
  `states.rest`. A release draws no ring, so a drag reads as grab, carry, drop.
- **Scale the parts, never the svg.** Each animated part carries its own
  `transform-box` and `transform-origin`. The dot's box already holds the popped
  halo, so nothing clips.
- **No CSS ships.** The hero's click sits inside a beat as percentages, and the
  demo animates with the Web Animations API, so a keyframe file would serve
  neither. Pass no fill mode: every part rests on its own attributes.
- **Reduced motion is static.** Draw the dot at rest and play none of the click.

With the Web Animations API, a press is:

```js
import pointer from "@kangentic/branding/assets/pointer/pointer.json";

function press(dot, ringLayer) {
  dot.querySelector('[data-part="core"]').style.transform = pointer.states.pressed.core;
  const { pop, ringGrow, ringFade } = pointer.motion;
  dot.querySelector('[data-part="halo"]').animate(pop.keyframes, { duration: pop.durationMs });
  const ring = ringLayer.querySelector('[data-part="ring"]'); // a fresh clone of pointer-ring.svg
  ring.animate(ringGrow.keyframes, { duration: ringGrow.durationMs });
  ring.animate(ringFade.keyframes, { duration: ringFade.durationMs });
}
```

A CSS beat converts each keyframe instead: a keyframe at `offset` of a track
that starts `t` ms into a `beat` ms loop sits at
`(t + offset * durationMs) / beat * 100%`, eased by that keyframe's `easing`.

## The priority meter

`assets/priority/` holds the meter a task's priority draws in the desktop app,
its web demo and the phone: one bar per level above the scale's bottom entry,
lit up to the task's level. A user renames and extends the scale, so this is a
**rule**, not a fixed glyph: `meter.json` carries the numbers and the rules for
any scale length, and the SVGs draw the default scale (None, Low, Medium, High,
Urgent) for reference.

```
meter.json        the numbers, the rules, pixelSnap, maxLevels, placement,
                  level 0, and worked tables to test an implementation against
meter-0.svg       None: four bars at 45%
meter-1.svg ...   Low to Urgent: one to four of four bars lit, the rest at 30%
meter-4.svg
```

Rules worth knowing:

- **The bars.** 3 wide, 10 tall (the capital height of the 14px title beside
  it), 2 apart, 1 corner radius, in layout px: CSS px on the desktop and the
  web, dp on the phone. A scale of `n` levels draws `max(1, n - 1)` bars, lit
  `min(max(level, 0), bars)` from the left, so a level past the end of the
  scale lights every bar.
- **Snap to whole device pixels.** A renderer rounds each edge on its own, so
  3px bars come out unequal at 125%, 150% and 175% display scaling. Round each
  of width, gap and height ONCE, half up: `floor(value * dpr + 0.5) / dpr`, and
  give every bar those values. React Native's
  `PixelRatio.roundToNearestPixel(value)` is the same rule. `pixelSnap.examples`
  tabulates it for the common scales.
- **Color is the level's own**, as the project's user picked it: tint through
  `currentColor`. A level past the end of the scale takes your fallback gray.
  Lit bars draw at full strength, unlit ones at `opacity.unlit` (0.3), and every
  bar of level 0 at `opacity.none` (0.45).
- **Level 0 on a card draws nothing** and keeps no slot. A list or picker that
  names every level draws it as four dim bars.
- **Placement.** On a card, the title row reads title, #N, the meter, then the
  corner glyph. The meter is decorative: the element around it carries the
  level's name ("Priority: High").
- **At most 7 levels.** A consumer that lets a user add levels stops at
  `maxLevels`; a scale that is already longer still draws by the rule.
- **The phone draws Views from `meter.json`**, not the SVGs: its activity
  renderer would stroke these rects as outlines and drop `fill-opacity`.

Drawn as spans on the web:

```js
import meter from "@kangentic/branding/assets/priority/meter.json";

const snap = (px, dpr) => Math.floor(px * dpr + 0.5) / dpr;

function drawMeter(el, level, levelCount, color, dpr = window.devicePixelRatio) {
  const bars = Math.max(1, levelCount - 1);
  const lit = Math.min(Math.max(level, 0), bars);
  const [w, gap, h] = [meter.bar.width, meter.bar.gap, meter.bar.height].map((v) => snap(v, dpr));
  el.style.cssText = `display:inline-flex;align-items:center;gap:${gap}px;height:${h}px;color:${color}`;
  el.replaceChildren(
    ...Array.from({ length: bars }, (_, i) => {
      const bar = document.createElement("span");
      bar.style.cssText = `width:${w}px;height:${h}px;border-radius:${meter.bar.radius}px;background:currentColor`;
      bar.style.opacity = i < lit ? meter.opacity.lit : level > 0 ? meter.opacity.unlit : meter.opacity.none;
      return bar;
    }),
  );
}
```

Redraw when `devicePixelRatio` changes (a window moving to another monitor):
``matchMedia(`(resolution: ${dpr}dppx)`)`` fires `change` when it does. To prove
an implementation, run it against `examples` (bar count, lit count, width and
opacities for scales of 1 to 7 levels) and `pixelSnap.examples`.

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
npm run gen:pointer  # demo pointer -> assets/pointer/
npm run gen:priority # priority meter -> assets/priority/
npm run check        # the mechanical brand-invariant gate
```

All brandmark geometry lives in `scripts/lib/mark.mjs` (the K is frozen path
data, so there's no font dependency at render time), all activity geometry in
`scripts/lib/activity.mjs`, all ui glyph geometry in
`scripts/lib/ui-glyphs.mjs`, the demo pointer in `scripts/lib/pointer.mjs`, and
the priority meter in `scripts/lib/priority.mjs`.
Generators are deterministic; CI reruns them on
every pull request and every push to `main`, and fails if committed output
drifts or if `npm run check` does. The release pipeline reruns both again on
the version tag, before anything is published.

## Release

`/release [patch|minor|major]` in Claude Code handles the determinism
gate, version bump, changelog, tag, GitHub release, and npm publish. On the
board every merge cuts a version: the Release column runs `/release auto`
after Merge, which picks a patch or minor bump from the commits without
asking. It also runs by hand from the `main` checkout. The package major
tracks the brand generation (v1 blue K, v2 Warm Craft); a major bump
archives the outgoing line first, and always stops for the maintainer.

## Deeper docs

The full mark rationale, geometry, and decision history live in the
project's Claude Code skills (`icon-drafting`, `sprite-drafting`,
`design-language`).
