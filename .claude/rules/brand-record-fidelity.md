---
paths:
  - "scripts/**"
  - "assets/**"
  - ".claude/skills/**"
---

# Rule: the record must match what the code actually does

This repo's prose is load-bearing in a way most repos' is not. CLAUDE.md makes
the `icon-drafting` decision history BINDING ("do not re-litigate rejected
directions without new information"), the geometry libs explain constants that
took many rounds to converge, and the generated manifests are the whole contract
a consumer builds against. So a sentence that drifts from the code it describes
is not a typo. It sends the next change either re-arguing a settled decision or
chasing a defect that is not there.

This is the failure mode that actually recurs here. Three shipped instances,
all found and all left standing for weeks: `lib/activity.mjs` announced the set
was "UNDER REVIEW" and that "nothing here ships to assets/" while nine marks
were shipping; `icon-drafting/SKILL.md` rejected a variant because two shapes
"merge into one notch" at 60px when the measured gap is 5px, about 8% of icon
height; and `animations.json` told consumers which frames a sequence PLAYS but
not which it must MOUNT, so following the README rendered nothing at all under
`prefers-reduced-motion`. None of these is catchable by a byte gate, because in
every case the bytes were exactly what the generator produced.

## The rule

- **A comment or record that states a STATUS must be re-read when the status
  changes.** Promoting a draft, shipping a set, or reverting a decision is not
  done until the prose around it says so. A header describing the file as under
  review outlives the review by default; nothing forces it to update.
- **A stated RATIONALE must survive measurement.** If a decision record explains
  a rejection with a claim about the pixels ("they merge", "it is illegible at
  60px"), that claim is checkable, and a change that touches the record checks
  it. When it fails, correct the rationale and keep the decision if another
  stated reason holds. Record the correction with its date and the measurement,
  as `activity-icon-geometry.md` and `icon-drafting/SKILL.md` already do. Never
  silently delete a wrong reason: the correction is the useful part.
- **A generated manifest must serve its DOCUMENTED consumption pattern, not
  just be internally consistent.** Read it as the consumer the README tells to
  build their own player, and check that following the docs literally produces a
  working result. `animations.json` ships `mountFrames` alongside `clip` for
  exactly this reason: the played set and the mount set differ, and every value
  a consumer would otherwise have to derive is a value some consumer will derive
  wrongly.
- **A review artifact must RENDER what its caption claims.** The sheets under
  `exploration/` are the evidence a human signs off from, so a caption that
  overstates them is worse than no caption. Verify the mock actually
  demonstrates its effect before trusting it. The worked instance: `sharp()`'s
  `.tint()` preserves LAB luminance and therefore cannot recolor pure white, so
  three bands of `exploration/review/mobile.png` rendered white on white and
  demonstrated nothing.
  - RESOLVED 2026-07-29, and the resolution is not what this bullet predicted.
    It used to close "Compositing through alpha (`blend: 'dest-in'`) is the
    fix", written before anyone had read `gen-review.mjs`. What shipped instead:
    `dest-in` is nowhere in `scripts/`, and the repo already had the alpha
    pattern in `templateTinted` (solid color, the artwork's alpha joined as the
    mask), so the alpha-only surfaces reuse it - the notification icon and the
    Android monochrome layer, joining the iOS tab raster that used it already.
    The iOS tinted master is different in kind: it is genuinely grayscale
    (`#a8a8a8` disc, `#ffffff` card), so a flat mask would have erased the very
    disc-vs-card difference its band exists to judge. It takes a luminance ramp
    (`systemTinted`) instead. One prescribed fix, two kinds of surface, two
    different right answers - which is the argument for reading the code before
    writing the remedy into a rule.
  - Both helpers now call `assertRecolored`, which throws if any opaque pixel
    survives the recolor still pure white. Verified to bite 2026-07-29 by
    pointing `templateTinted` back at `.tint()`: `npm run gen:review` fails with
    `notification-icon.png: an opaque pixel is still pure white after recoloring
    to #c0562f`. That is the bullet below applied to this one.
    - Scope it honestly: this is a GENERATOR assertion, not a CI gate.
      `gen:review` is the one generator neither `ci.yml` nor `publish.yml` runs,
      because its output is a review artifact exempt from byte determinism. So
      it fires when the sheet is regenerated, which is the moment that matters
      for a sheet, and never on a push that leaves the sheet alone.
- **Prefer making a claim mechanical over restating it.** When a check can be
  expressed as an assertion, put it in `scripts/check-invariants.mjs` and note
  that it was verified to bite. `ANIMATION`'s `mountFrames` assertion and
  `ACTIVITY`'s byte-equality assertion are the pattern: both replaced a sentence
  that could go stale with a test that cannot. Where the assertion needs sharp,
  it goes in the generator instead, because the checker is deliberately sync and
  dependency-free: `gen-ui.mjs`'s `assertTemplateImage` and `gen-review.mjs`'s
  `assertRecolored` are that variant. Say which of the two a claim got, since
  only the first runs in CI.

## Enforcement (self-maintaining)

- **Review (primary):** `/code-review` on the PR. Its first agent audits
  CLAUDE.md adherence and reads the CLAUDE.md files covering every modified
  directory, so this rule reaches it through the index in CLAUDE.md. It is
  review, not a gate: none of the checks above is mechanically decidable in
  general, which is exactly why they need a reader.
- **Gate (blocking, where a claim was made mechanical):** `npm run check` runs
  in `.github/workflows/ci.yml` on every pull request and every push to `main`,
  and again in `publish.yml` on the version tag. The `ci.yml` run is the
  required status check on `main`, so it blocks the MERGE. `ANIMATION`
  asserts each sequence's `mountFrames` equals its played frames plus the rest
  frame. Verified to bite: stripping `rest` from `running-loop` reports
  `running-loop: mountFrames is [step-a,step-b], must be
  [step-a,step-b,rest]`.
- **Gate (blocking): `RECORD` holds the gate's own roster to its records.**
  Added 2026-07-30, after three records that ENUMERATE the checks had each
  drifted: the checker header named six of nine, `CLAUDE.md` named five in one
  place and three in another, and `ci.yml` named a different five. `MONO`,
  `ACTIVITY` and `UI` were each added without updating any of them, which is the
  "a comment stating a status must be re-read when the status changes" bullet
  above, three times over. The roster is DERIVED from the `order` array rather
  than written out, so it cannot be the thing that goes stale; comment leaders
  are stripped before whitespace is collapsed, so a record may wrap the roster
  across `//` or `#` lines. This is the byte-equality idiom `ACTIVITY` and `UI`
  use, pointed at prose instead of SVG. It runs in CI.
  - Verified to bite in BOTH directions, because they exercise different paths.
    Removing the roster from a record reports (once per affected site):

    ```
    RECORD    FAIL
        - CLAUDE.md: the Project Structure map does not enumerate the 10 registered checks (expected "PALETTE, SPRITE, TIERING, FROZEN-K, BANNED, MONO, ANIMATION, ACTIVITY, UI, RECORD")
    ```

    And adding a check without touching any record fails all three at once,
    which is the recurrence this exists to stop. That second direction is the
    one that proves the roster is genuinely derived from `order` rather than
    pinned to a literal someone must remember to update.
  - Scope it honestly: this catches an enumeration that goes STALE. It cannot
    catch a brand-new partial enumeration written somewhere it does not know
    about, and `CLAUDE.md`'s Development block deliberately points at the header
    rather than repeating the list, because one enumeration per document is the
    only count that stays true. The review arm above covers the rest.
- **History:** this rule replaces the code-review half of the retired
  `/brand-review` skill. Seven runs of that skill produced findings of exactly
  this class and no others that another gate did not already cover; the column
  was removed 2026-07-29 because its findings had no delivery path, not because
  they were wrong.

## Scope

`scripts/**`, `assets/**`, and `.claude/skills/**`. Governs the relationship
between prose and code, so it applies to comments, decision records, READMEs and
generated manifests alike. It does not govern geometry, palette or determinism:
those have their own rules and their own mechanical gates. The aesthetic call
(does the mark read as craft, is it unmistakable at 24x24) is not in scope here
and stays a human decision made from rendered artifacts during Executing.
