# Kangentic Branding

Single source of truth for Kangentic brand assets, consumed by the website
(kangentic.com), the desktop app, and the mobile app. Icons change here,
version bumps, consumers update - never edit brand assets inside a consumer
repo.

## Versioning

The package major tracks the brand generation (semver):

- **v1 - blue K (2025)**: the original blue disc K. Frozen verbatim in
  `archive/v1/` (app icon ladder + ICO/ICNS in `app/`, website logo and
  favicons in `web/`) so the brand's history and progression stay
  comparable. Never regenerated, never edited.
- **v2 - Warm Craft (2026)**: the current line, `assets/`. Cream, ink,
  rust, amber; the two-tier mark below. Minor/patch bumps for refinements
  within the line; the next full rebrand becomes v3 and this line moves to
  `archive/v2/`.

## The mark (v2): a two-tier system

| Asset | Mark | Use at |
|-------|------|--------|
| `assets/brandmark.svg` | Card-K knockout: rust disc, card-shaped alpha hole, floating rust K with severed amber arm-tip | >= 48px (hero, social, print) |
| `assets/brandmark-small.svg` | F4k board glyph knockout: three column holes through the rust disc, amber card mid-drop (letterless) | < 48px (nav, favicons, tray) |
| `assets/brandmark-filled.svg` | Card-K with the card painted cream (fixed appearance) | Stores / unknown grounds |

Both tiers are knockouts - true alpha holes, so the page or OS theme flows
through - and share the "holes in the rust disc" DNA. The split exists
because below ~48px the card-K fails structurally (the rust K merges with
the rust ring); the letterless board glyph won the live in-header review
at 24-26px. Full rationale, geometry constants, and decision history:
`docs/ICON-DRAFTING.md`.

The Overseer mascot (amber pixel blob) is a separate asset from the
brandmark, by design; its pipeline migrates here from the website repo in
the production build-out.

## Regenerating

```bash
npm install
npm run gen     # writes exploration/icon-concepts/ + canonical assets/
```

The K is frozen path data (Microsoft Tai Le Bold, extracted once) - no
font dependency at render time. `exploration/` holds concept renders and
the review contact sheets; `assets/` is what consumers ship.

## Consuming

Preferred: npm - `npm install @kangentic/branding`, copy or import from
`node_modules/@kangentic/branding/assets/`. A git submodule also works if
a consumer can't take an npm dependency, with the usual submodule
pointer-bump caveats.

## Migration status

Moved here: the brandmark harness (`scripts/gen-brandmark.mjs`), canonical
marks, v1 archive. Still in consumer repos, migrating during the
production build-out: mascot sprite pipeline (`gen-sprites.mjs`), app icon
set builder (`gen-app-icons.mjs`, ICO/ICNS), OG image builder
(`gen-brand.mjs`) - all currently in kangentic.com `scripts/` - and the
Warm Craft exploration history in the app repo's `resources/rebrand/`.
