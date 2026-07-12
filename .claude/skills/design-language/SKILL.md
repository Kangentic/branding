---
name: design-language
description: The Warm Craft design language for the Kangentic brand - palette tokens, typography, pixel-art mascot conventions, shape, motion budget, copy voice, and the anti-AI-template checklist. Read before any visual/brand-asset change in this repo.
---

# Warm Craft: The Kangentic Design Language

> Brand-wide copy. kangentic.com carries the same skill for site work;
> when the constitution changes, update both (they must not drift).
> Site-specific sections near the end describe where the system applies
> on kangentic.com.

## The story (why this looks the way it does)

This direction was synthesized from four sites Tyler picked as his taste profile:
tigerbeetle.com, bun.sh, val.town, and fly.io. What they share, and what this system
encodes, is craft over styling:

- **A made thing at the center, not an aesthetic.** TigerBeetle has pixel art, Bun has
  the bun, Fly.io has hand illustrations. Kangentic has a pixel-art board creature -
  the kanban board come alive - with an amber card always working through its middle
  column.
- **Warmth undercutting seriousness.** Serious machinery (eleven agent CLIs, git
  worktrees, PTYs) with a friendly face. Never enterprise, never edgy-hacker.
- **Light and airy; dark reserved for substance.** The page is warm cream. Dark
  regions are always content: terminals, code, real product output. Dark is never
  mood.
- **Proof in the hero, not poetry.** Stats and running software over adjectives.
  "11 agent CLIs · 100% local · $0 forever" leads; superlatives never do.

If a proposed element cannot be justified as crafted, warm, light, or proof, it does
not belong.

## Palette tokens

Core:

| Token | Hex | Role |
|-------|-----|------|
| `--cream` | `#FDFBF7` | Page ground. Warm, airy. |
| `--panel` | `#F6F1E8` | Section and column tint on cream. |
| `--card` | `#FFFFFF` | Cards and raised surfaces. |
| `--ink` | `#24201B` | Text, structure. Warm near-black. |
| `--ink-soft` | `#6E6659` | Secondary text. |
| `--hairline` | `rgba(36,32,27,0.16)` | Rules and quiet borders. |
| `--rust` | `#C0562F` | Primary accent: buttons, links, the mascot's fur. |
| `--amber` | `#E8A33D` | Secondary accent: terminal highlights, small warm touches. |
| `--terminal` | `#1D1915` | Terminal panel ground. Warm black, NEVER navy. |
| `--term-text` | `#F3EDE3` | Terminal foreground. |

Status lamps (micro-detail only: card status dots, activity indicators - never brand,
never decoration):

| Token | Hex | Meaning |
|-------|-----|---------|
| `--run` | `#218A4C` | Agent running. |
| `--attn` | `#D98324` | Agent needs you. |
| `--blocked` | `#BE4034` | Blocked or error. |

Rules:
- Rust is the one brand accent. Amber supports inside dark panels and small highlights;
  it never competes with rust at the same weight on the same surface.
- Status colors appear only where they carry agent-status meaning.
- Banned: `#13151f`-family navy, indigo `#5b7bf2`-family, purple anything, gradient
  fills of any kind.
- Docs dark theme ("night" variant): `--terminal`-family ground `#1D1915`, cream text
  `#F3EDE3`, amber accent. Landing page is light-only.

## Typography

Four faces, four registers. All free for commercial use, all self-hosted woff2 in
`public/fonts/` (no Google Fonts requests):

| Role | Face | Source | Usage |
|------|------|--------|-------|
| Display | **Bricolage Grotesque** (700) | Google Fonts, OFL | Headlines. Warm, characterful, never Inter-adjacent. |
| Body | **Switzer** (400/500/600) | Fontshare, ITF FFL | Everything readable. Quiet on purpose. |
| Machine | **IBM Plex Mono** (400/500) | Google Fonts, OFL | Terminal content, code, commands, data. |
| Plate | **Departure Mono** (400) | departuremono.com, OFL | Pixel mono for micro-labels ONLY: eyebrows, column headers, stat captions, status chips. Uppercase, 10-12px, 0.05em tracking. Ties the type to the pixel-art craft. |

Rules:
- Departure Mono never exceeds 12px and never sets a sentence.
- No Inter, Roboto, Space Grotesk, Manrope, Sora, or Geist anywhere.
- Numbers that carry proof (stats strip) are set big in the display face with plate
  captions, `font-variant-numeric: tabular-nums`.

## The mascot: pixel craft

The one illustration style this system allows is pixel art, because it is buildable
and maintainable in-house without an illustrator, and it earns the TigerBeetle-style
"craft object" centerpiece.

The mascot is **the Overseer**: a soft AMBER blob with THREE sparkle eyes - it
watches all your agents at once (the three eyes also echo three board columns) -
with side arms out and three feet. Chosen by Tyler over animal mascots (the
original kangaroo) and over arcade borrowings (invader, pacman, plain
block-with-eyes - too close to OpenClaw, Pac-Man, and Claude Code's icon). The
body is amber, NOT rust, on purpose: a rust-bodied critter reads one shade from
Claude Code's terracotta icon, and Kangentic is agent-agnostic. The amber-body
mascot is the sanctioned exception to "amber never competes with rust" - it is
the one element allowed to carry amber at full weight on the light page.

Conventions:
- Sprites are authored as ASCII maps in `scripts/gen-sprites.mjs` (canonical map:
  `overseerAmber`), rendered to inline SVG `<rect>` grids with
  `shape-rendering: crispEdges`. Never freehand SVG paths, never AI raster art.
- Palette per sprite: 4 colors max, drawn from the token table (amber body, ink
  eyes, cream sparkles).
- Display sprites at integer multiples of the pixel grid only; never fractional
  scaling (it blurs the pixels and kills the craft).
- The Overseer is the only character. It may appear at most once per page. Poses
  (blink frames - the eyes can blink in sequence, one per agent - or wave frames)
  are variations of one map, not new characters.
- Alt text always describes it plainly ("Pixel-art Kangentic mascot").

Canonical map (18 wide, 12 tall; `a` amber, `k` ink eye, `c` cream sparkle):

```
.....aaaaaaaa.....
...aaaaaaaaaaaa...
..aaaaaaaaaaaaaa..
..aakcaakcaakcaa..
..aakkaakkaakkaa..
aaaaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaaaa
..aaaaaaaaaaaaaa..
..aaaaaaaaaaaaaa..
...aaaaaaaaaaaa...
....aa..aa..aa....
....aa..aa..aa....
```

Refining the sprite (sequential eye-blink frames, wave frames) is expected;
replacing pixel art with another style is not. Alternates and retired
explorations (the board creature `boardRest`, the kangaroo, the concept rounds)
live in `scripts/gen-sprites.mjs` and `scripts/sprites/` for reference.

## Shape and texture

- Cards: white, 1px solid `rgba(36,32,27,0.22)` border, radius 8px, and the signature
  resting shadow `box-shadow: 0 2px 0 rgba(36,32,27,0.18)` - a crisp underline of
  weight, not a floating blur.
- Buttons: radius 8px, primary rust with cream text, secondary white with ink border.
  Hover: lift 1px (transform) with shadow growing to `0 3px 0`; active presses flat.
- Columns and section bands: `--panel` tint, no border, radius 8px.
- Terminal panels: `--terminal` ground, radius 8px, slim plate-label bar (Departure
  Mono), no macOS traffic-light dots.
- Banned: pill radii (999px), glassmorphism/backdrop-filter, blurry drop shadows,
  radial glows, dot-grid backgrounds, gradient text, animated specular borders, bento
  grids, floating-screenshot-in-glow heroes.
- No emoji in headings or UI copy; the mascot does the personality work.

## Structure patterns

- Hero: headline, one-sentence sub, two buttons, the mascot, then a stats strip
  (display-face numbers + plate captions) as the proof line.
- Features render as kanban cards (plate label, title, status lamp as micro-detail)
  or a ledger, never equal icon-topped boxes.
- Real product UI appears as terminal panels and board mockups, framed by the light
  page.
- Structural devices (numbering, eyebrows) only where order or hierarchy is real.

## Motion budget

Details live in the `motion-craft` skill. Summary:
- One orchestrated set piece per page: on the landing page, the board demo where a
  task card is dragged from To Do to Executing in one smooth drop arc (cards follow
  the app's own drop animation), the card's lamp turns green, and a terminal panel
  types real agent output. SPRITE animation, when used, is stepped (`steps()`
  between 2-4 poses), never tweened - pixels hop, they do not glide.
- Everything else: micro-interactions at 150-200ms and small scroll reveals.
- Reduced motion is a first-class rendering: rest on the completed frame.

## Copy voice

- Verb-first, concrete nouns. "Drag a card. An agent starts."
- Proof over adjectives; ban list: seamless, powerful, supercharge, unleash,
  revolutionize, effortless, blazing, next-generation, "built for modern teams."
- Sentence case everywhere, including buttons and headings.
- One wink per page is allowed (Fly.io warmth); two is a comedy routine.
- No em-dashes, no arrow characters (site-wide rule).
- Numbers stay honest: "11 coding-agent CLIs," never "unlimited agents."

## The anti-template checklist

Run against any new visual work. If three or more are true, stop and redesign:

1. Navy or near-black page background with a colorful glow
2. Indigo/purple/blue-gradient accent
3. Inter or another AI-default face
4. One gradient-colored word in the hero headline
5. Dot-grid background
6. Glassmorphism or 0.1-opacity soft shadows
7. Equal feature boxes with an icon on top of each
8. Pill badges
9. Emoji doing the work of design
10. Headline shaped like "The X built for modern Y"

## Where the system applies

- `src/pages/index.astro` - full system, light-only.
- `src/styles/custom.css` + Starlight props - docs re-skin, light default plus the
  warm-black night dark theme, mapped through `--sl-color-*` custom properties.
- `src/layouts/BaseLayout.astro`, `BlogPost.astro`, blog index - same tokens.
- `public/og-image.png`, `src/consts.ts` `THEME_COLOR`, `site.webmanifest` colors -
  must match the cream/ink/rust system when the reskin ships.
- The blue "K" logo (`public/logo.png`) clashes with this system; the redesign task
  covers recoloring or a pixel-mark replacement, flagged for Tyler's sign-off.
