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
  demonstrates its effect before trusting it. Known live instance: `sharp()`'s
  `.tint()` preserves LAB luminance and therefore cannot recolor pure white, so
  three bands of `exploration/review/mobile.png` render white on white and
  demonstrate nothing. Compositing through alpha (`blend: 'dest-in'`) is the
  fix.
- **Prefer making a claim mechanical over restating it.** When a check can be
  expressed as an assertion, put it in `scripts/check-invariants.mjs` and note
  that it was verified to bite. `ANIMATION`'s `mountFrames` assertion and
  `ACTIVITY`'s byte-equality assertion are the pattern: both replaced a sentence
  that could go stale with a test that cannot.

## Enforcement (self-maintaining)

- **Review (primary):** `/code-review` on the PR. Its first agent audits
  CLAUDE.md adherence and reads the CLAUDE.md files covering every modified
  directory, so this rule reaches it through the index in CLAUDE.md. It is
  review, not a gate: none of the checks above is mechanically decidable in
  general, which is exactly why they need a reader.
- **Gate (blocking, where a claim was made mechanical):** `npm run check` runs
  in `.github/workflows/ci.yml` and `publish.yml` on every push. `ANIMATION`
  asserts each sequence's `mountFrames` equals its played frames plus the rest
  frame. Verified to bite: stripping `rest` from `running-loop` reports
  `running-loop: mountFrames is [step-a,step-b], must be
  [step-a,step-b,rest]`.
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
