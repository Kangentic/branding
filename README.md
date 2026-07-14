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
  Animation pose frames ship alongside it (`overseer-blink.svg`,
  `overseer-wave.svg`) for consumer-side stepped frame swaps, plus the
  first-visit fly-in overture set (`overseer-ufo.svg`, `ufo.svg`,
  `minion.svg`, `minion-run.svg`); reduced motion rests on the canonical
  frame.
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
