---
paths:
  - "scripts/**"
  - "assets/activity/**"
---

# Rule: activity icon geometry lives only in scripts/lib/activity.mjs

The activity set is the agent, Command Terminal and pause/stop marks this repo
OWNS for the desktop app, the mobile app and the website. It exists because those
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
- **One grid, one stroke, TWO keylines - one per ROLE.** 24 viewBox, stroke 2,
  round caps and joins. An INDICATOR is a 14px label in a counter row and sits
  on the 18-unit slot, x 3 to 21. A CONTROL is a 20px target in a header and
  sits on x 2 to 22 (`CONTROL_RING_R` = 10). Both spans are declared in
  `KEYLINES` and a mark is assigned one by `keylineFor()`, on its id prefix.
  Within its keyline each form is sized **optically**, not stretched to a
  shared rectangle.
  - A keyline is the invariant WITHIN A ROLE because width is what aligns the
    row: icons in a horizontal row behave like glyphs in a line of type, where
    width is the advance and height is absorbed by centring. The counts beside
    these marks already render `tabular-nums`, so keyline parity is that same
    discipline extended one element left. Height never contributed to that
    column. Roles do not share a row, which is why they need not share a span:
    a header's controls and a counter row's indicators are never adjacent.
  - **Geometric parity is not optical parity.** At an identical 18x18 box the
    ring encloses ~21% less area than the chip (a circle fills only pi/4 of its
    box) and carries 39% less ink. Forcing one silhouette onto every mark
    produces disparity that nobody chose; sizing each form to look right within
    the slot is what actually delivers parity.
  - So height is per-form. The envelope is **18 x 14.4**: an envelope's aspect
    is its identity, and it also needs a silhouette that is not the terminal
    chip's exact rect. Boxes are declared in `ENVELOPE_CANDIDATES`.
  - Corrected 2026-07-29. This bullet used to read "one ink box... a mark that
    does not fill the ink box reintroduces the exact misalignment this set
    removes." That asserted an invariant the stock glyphs never had (their own
    mail was 20x16, loader 18 wide, circle 20 wide), conflated two separable
    properties, and ruled out the fix categorically rather than on evidence.
  - Corrected again 2026-07-29, second pass. This bullet and the Enforcement
    bullet below both used to read "Every mark's outline spans x 3 to 21",
    asserting ONE keyline for the whole set. That had been false for the four
    `control-*` marks since the per-role split: they ship at r=10, so they span
    2 to 22, and `KEYLINES` has declared two spans since. Holding both roles to
    one span is precisely what shrank the controls by 10 percent in 2.5.0. The
    change that restored `CONTROL_RING_R = 10` and made the gate per-role
    updated only the envelope half of this rule, so the sentence its own
    decision had just falsified survived it. That is the point worth keeping:
    this is the record-drift failure the same change was correcting, committed
    by that change, in this file. It is why `brand-record-fidelity.md` exists.
- **A flap ratio is not a flap angle.** Flap ratios are fractions of the box,
  so transplanting them onto a box of a different aspect does NOT carry the
  angle across: half-width moves with the width, depth moves with the height.
  The angle is `2*atan((w/2)/depth)` and it is what the eye reads. Getting this
  wrong is how the shipped envelope ended up 11.6 degrees pointier than the
  reference it was derived from, while the record claimed the angle was
  preserved. Only a uniform scale preserves an angle. A candidate may therefore
  declare a target `angle` instead of a flap variant (`candidateFlap()`), which
  pins the V across any box; prefer that over ratios whenever a box moves.
- **An activity candidate is reviewed ALONE, not only in adjacency.** Stacked
  rows, adjacency pairs and counters against a hairline datum measure alignment;
  they cannot see a recognition failure, because every glyph in them has a
  neighbour. The board renders one mark on a card. `gen:activity` emits
  `_isolation-*.png` and `_isolation-zoom-*.png` for exactly this, and a
  candidate reviewed only in adjacency is unreviewed.
- **`currentColor` only. Never a hex.** The three consumers do not share status
  token values (desktop `#34d399`/`#e3b341`, mobile `#3ddc84`/`#d9b83f`, web
  `#218a4c`/`#d98324`), and a hex in a mark would pick one surface's palette for
  all of them. Tone is the consumer's to apply.
  - **The divergence is deliberate and forced, verified 2026-07-30 rather than
    assumed.** It looks like drift because the web pair matches
    `design-language`'s lamps character for character, which invites the reading
    that two consumers wandered off. The opposite is true: that skill is kept in
    sync with kangentic.com's copy, so the lamp table IS the cream-surface
    palette, and the match is structural. Ground luminance then forces the rest.
    All four dark-theme values measure 1.73-1.88:1 on cream, under the 3:1
    non-text floor, so the website cannot adopt them; the web pair clears 3:1 on
    both dark grounds but at about half the native contrast, on a 2px stroke with
    a 12px floor. Each surface anchors to its own system (a Tailwind ramp, a
    terminal ANSI palette, these lamps).
  - The clinching argument for keeping a hex out of the geometry is that one hex
    already means two things: `#d9b83f` is mobile's ATTENTION amber and the
    desktop's CAUTION band, the latter deliberately chosen so a caution band
    would not borrow a session-state hue. A mark carrying that value would be
    correct on one surface and wrong on the other.
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
- **Keyline parity is mechanical, PER ROLE.** The same check measures every
  shipped mark's outline span and fails any mark that runs off the keyline
  `keylineFor()` gives it, so the column-alignment property this set exists for
  is enforced rather than reviewed, without holding a 20px target to a 14px
  label's extent. Verified to bite 2026-07-29 by reintroducing the 2.5.0
  regression itself - setting `CONTROL_RING_R = 9`, regenerating so the
  byte-equality assertion still passes, then running the gate:

  ```
  ACTIVITY  FAIL
      - control-pause-idle: outline spans x 3..21, off its keyline 2..22 (20px target in a header)
  ```

  (one such line per control mark, four in total).
- **The control keyline's span is written out, NOT derived from
  `CONTROL_RING_R`.** It looks like a constant begging to be substituted, and
  substituting it silently disables the check above: the keyline is the
  SPECIFICATION and the ring radius is the implementation, so coupling them
  makes the assertion compare a value to itself. Verified 2026-07-29: with
  `CONTROL_RING_R = 9` and the keyline derived from it, the four findings quoted
  above disappear and `ACTIVITY` reports PASS on the exact regression it exists
  to catch. This is the one place in the lib where an inline number is correct.
- **CI gate (blocking):** `npm run gen:activity` runs in the determinism gate
  alongside the other generators, on every pull request and every push to
  `main`, and again on the version tag in `publish.yml`.

## Scope

`scripts/**` and `assets/activity/**`. This is a THIRD visual vocabulary,
distinct from the brandmark (`lib/mark.mjs`, knockout-disc geometry) and the
mascot (`lib/sprite.mjs`, pixel-art rect grids). The pixel-art rule's ban on
freehand `<path>` governs sprites, not these: a stroked UI affordance glyph is
not illustration. Review artifacts under `exploration/activity/` are exempt from
byte determinism.
