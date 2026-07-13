---
description: Review a Kangentic branding change end to end - code review of the generator scripts plus design review of the assets they produce (determinism gate, in-situ + size-strip renders, mechanical invariant checks), then surface everything for human aesthetic sign-off. The Brand Review column runs this.
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(npm:*), Bash(node:*), Write
---

# Brand Review

The review station for a branding change. On this repo a change is almost
always a GENERATOR change (a `scripts/**` edit plus its regenerated
`assets/` and `resources/`), so a review has two halves: the generator
logic is real code with a real correctness surface, and the marks/sprites
it produces are visual work with hard invariants. This skill does both,
mechanically where it can, and hands the aesthetic call to a human.

It does not re-derive the disciplines it enforces - it runs them. The
canonical sources are the `icon-drafting`, `sprite-drafting`, and
`design-language` skills, and the rules in `.claude/rules/`
(`mark-geometry-single-source`, `pixel-art-conventions`,
`generated-assets-determinism`). Read those for the WHY; this is the HOW.

## What this gates

- **BLOCKING, gated automatically:** the determinism gate (Step 2) and the
  mechanical invariants (Step 4). These are pass/fail. A failure stops the
  review - it is a finding the change must fix, not a judgment call.
- **NOT gated - stays a human decision:** the aesthetic call. Does the mark
  read as craft and not AI clip-art? Is it unmistakable at 24x24? Does the
  mascot read as warm? A machine renders the evidence and runs the
  checklist; a PERSON signs off. Never auto-approve on green mechanical
  checks alone.

## Step 1 - Code review (the generators are real code, but a SMALL surface)

Review the changed generator code for correctness. Keep it RIGHT-SIZED:
this repo is a handful of deterministic Node scripts with no runtime app, so
a single focused pass over the diff is the whole job. Do NOT spawn a
multi-agent, xhigh, or ultra review - that is wildly disproportionate to a
few hundred lines of Node and burns tokens for nothing.

Run `git diff main...HEAD -- scripts/` (or the working diff if unstaged) and
read it directly. The correctness surface, when a change touches it:

- `scripts/lib/mark.mjs` - the geometry: the frozen `K_PATH`, the split-tip
  cuts (`cutFor`, `CUT_CANON`/`CUT_SMALL`), the glyph-derived tight card,
  `cardKParts`/`f4kParts`, the knockout/`discOnSquare` builders.
- `scripts/gen-icons.mjs` - the tier picker `markFor(size)`, the ICO/ICNS
  container builders, the ladder, every surface write.
- `scripts/lib/sprite.mjs` - `rects`/`buildSvg`, the run-length merge.
- `scripts/gen-brandmark.mjs`, `gen-sprites.mjs`, `gen-og.mjs`,
  `scripts/check-invariants.mjs`, `scripts/gen-review.mjs`,
  `scripts/bash-guard.js`.

Focus on what the later mechanical steps do NOT catch: logic bugs, off-by-one
in the geometry math, a non-deterministic generator, a check-invariants
heuristic that would false-pass or false-fail. If you want a second opinion,
`/code-review` at LOW effort is fine - never at high, xhigh, or ultra.

## Step 2 - Determinism gate

The committed `assets/` and `resources/` must be EXACTLY what the harness
generates. A dirty tree here means a generator changed without regenerating
(commit the regenerated output) or an asset was hand-edited (never allowed
- fix the script). Mirrors the `/release` gate.

1. `npm run gen`
2. `npm run gen:icons`
3. `npm run gen:sprites`
4. `npm run gen:og`
5. `git status --porcelain -- assets/ resources/`

Step 5 must be EMPTY. Anything listed is a BLOCKING finding - report which
files drifted and stop until it is resolved. (Generators are deterministic:
no `Date.now()`, no `Math.random()`, no network. Same inputs, same bytes.)

## Step 3 - Render the review artifacts

Produce the evidence a human eyeballs, per the `icon-drafting` and
`sprite-drafting` review disciplines. Most of it the generators already
emit; one command fills the in-situ gap.

- `npm run gen` writes to `exploration/icon-concepts/`: the size strips at
  192 AND 48/32/26/24/16 on cream/white AND warm-black/black
  (`_sheet*.png`), the x8 nearest-neighbor pixel-truth zoom
  (`_small-rescue.png`), and the tight-card small-size comparison
  (`_card-tight-compare.png`).
- `npm run gen:sprites` writes the mascot at 16x to `exploration/mascot/`.
- `npm run gen:icons` writes `exploration/icon-concepts/preview.png` - the desktop ladder
  on light and dark bars, showing the card-K / F4k tier boundary.
- `npm run gen:review` writes `exploration/review/in-situ.png` - the
  IN-SITU header mocks: light site header + dark docs header + browser tabs,
  the mark at nav and favicon size on both themes.

Point the human at those exact paths. Judge the mark at 16-32px FIRST -
that is where icons live - and confirm it is **unmistakable at 24x24** (the
legibility floor). `exploration/` renders are review artifacts, not shipped
assets, so they are exempt from the Step 2 determinism gate.

## Step 4 - Mechanical invariants

Run `npm run check` (`scripts/check-invariants.mjs`) and relay the report.
Any FAIL is BLOCKING. It checks:

- **PALETTE** - every hex in a shipped SVG is a Warm Craft token (amber
  `#e8a33d`, rust `#c0562f`, ink `#24201b`, cream `#fdfbf7`) or a
  structural mask key (`#fff`/`#000`). No off-palette color.
- **SPRITE** - each `assets/mascot/*.svg`: <= 4 fills, all palette tokens;
  `shape-rendering="crispEdges"` present; integer scale only (no fractional
  `scale()`); rect grid only (no freehand `<path>`); `OVERSEER` declared
  once in `lib/sprite.mjs`.
- **TIERING** - no OS-downscaled single-image master (`squarePng`, the
  store / PWA / apple-touch / favicon surfaces) is fed card-K. Feeding
  `cardKParts`/`markFor`/`discPng`/a >=128 ladder entry into one is the
  wrong-icon bug the rule exists for.
- **FROZEN-K** - no `<text>` in a shipped brandmark/icon SVG (the K is
  frozen `K_PATH` -> `<path>`); no geometry constant declared outside
  `lib/mark.mjs`.
- **BANNED** - the grep-able slice of the anti-template checklist: no
  navy/indigo/purple families, no gradient fills.

## Step 5 - Anti-template checklist

Run the 10-item checklist in the `design-language` skill
(`## The anti-template checklist`) against the Step 3 renders. If THREE OR
MORE are true, stop and flag a redesign. This is a judgment aid for the
human, not an auto-gate - the full aesthetic read is theirs.

## Step 6 - Report and await human sign-off

Summarize, in one place:

- Step 1 code-review findings.
- Step 2 determinism result (clean / which files drifted).
- Links to the Step 3 artifacts (the exact `exploration/` and
  `exploration/icon-concepts/preview.png` paths).
- The Step 4 mechanical report (per-invariant PASS/FAIL).
- The Step 5 checklist result.

State plainly whether the mechanical gates passed or failed. Then STOP for
the human aesthetic sign-off - do NOT auto-approve the change and do NOT
move the task forward. Mechanical green is necessary, not sufficient; the
"reads as craft" call is a person's to make.

## Allowed tools

`Read`, `Glob`, `Grep`, `Bash` (for `git`, `npm`, `node`), `Write` (a temp
findings file if useful), and `/code-review` for the Step 1 correctness
pass.

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE
command. Never use `&&`, `||`, `|`, or `;`. Use `git -C <path>` for git in
another directory - never `cd <path> && git ...`.
