---
description: Regenerate and verify brand assets, version bump, changelog, tag, GitHub release, and tag-triggered CI npm publish for @kangentic/branding. This is the Release column skill, which the board runs as /release auto after every merge; it also runs by hand from the main checkout.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(gh:*)
argument-hint: [auto|patch|minor|major]
---

# Release

Release pipeline for `@kangentic/branding`: verify the committed assets match
the harness, bump, changelog, tag, push, GitHub release. Pushing the tag
triggers `.github/workflows/publish.yml`, which reruns the determinism gate
in CI and publishes to npm with provenance via OIDC - no local `npm publish`,
no stored token. Consumers (kangentic.com, kangentic desktop, kangentic-mobile)
update by bumping this package - a release here is how icons change everywhere.

This is the **Release column** skill, and every merge cuts a version. The board sends
`/release auto` to a task that entered Release after the **Merge column**
(`/merge-pull-request`) landed its PR, which is worktree mode below. `auto` applies the bump Step 0
suggests without asking, so the normal path waits for nobody: a run that published ends on
`Release: published`, and the board moves the task to Done (see "Outcome line" below).

Two stops survive `auto`, because each one used to sit behind a person and must not quietly
disappear: a suggested **major** bump (the major-bump gate below), and, in worktree mode, any
commit beyond `origin/main` that the release would push straight to `main` (pre-flight 4). Run by
hand with no argument, the skill still suggests a bump and waits for confirmation.

**Usage:** `/release [auto|patch|minor|major]`

Runs from the main checkout (on `main`) or from a task worktree. From a worktree it pushes
`HEAD:main`; see the pre-flight checks and Step 5.

- `/release` - suggests a bump type from the commit history and asks for confirmation
- `/release auto` - applies the suggested patch or minor bump without asking (the Release column
  sends this); a suggested major still stops
- `/release patch` - refinements within the current brand line (2.0.0 to 2.0.1)
- `/release minor` - new assets/variants within the line (2.0.0 to 2.1.0)
- `/release major` - A NEW BRAND GENERATION ONLY. See the major-bump gate below.

**Release type (optional):** $ARGUMENTS

## The major-bump gate

The package major tracks the brand generation (v1 = blue K, v2 = Warm
Craft). A major bump means the brand itself changed. If `major` is
requested or suggested:

1. Confirm with the user that this is a deliberate rebrand, not a large
   asset update.
2. Verify the outgoing line has been archived: the current `assets/` and
   `resources/` must be copied to `archive/v<current-major>/` in the same
   or an earlier commit. If not archived, stop: "Archive the v<N> line to
   archive/v<N>/ before releasing v<N+1> - brand history is never lost."

`auto` never applies a major. When Step 0 suggests one, report the suggestion and the commits
behind it, and stop with no outcome line. The maintainer confirms the rebrand and the archive,
then runs `/release major`. Never archive on your own initiative.

## Step 0 -- Determine Bump Type

0. **Catch up first, in a task worktree** (CWD contains `.kangentic/worktrees/`). Run
   `git fetch origin main`. If `git merge-base --is-ancestor HEAD origin/main` succeeds, the branch
   is at or behind `origin/main`, as it is when a sibling card's release landed after this merge.
   Fast-forward it with `git merge --ff-only origin/main` (a no-op when it is already there), so
   the tag lookup below sees that release.
1. **Find the previous tag:** Run `git describe --tags --abbrev=0`. Note whether this succeeds or fails (no tags = first release).
2. **Collect commits since last tag:** Run `git log <previousTag>..HEAD --oneline --no-decorate` (or `git log --oneline --no-decorate` if no previous tag).
   If the list is empty, nothing has landed since the last tag, because a sibling card's release
   already shipped this merge. Report that, make no bump and no tag, and end on the line
   `Release: nothing to publish`.
3. **Analyze conventional commit prefixes to suggest a bump type:**
   - Any commit with `!` after the type or containing `BREAKING CHANGE` -- suggest **major** (and apply the major-bump gate)
   - Any `feat:` commit -- suggest **minor**
   - Only `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`, `ci:`, `build:` -- suggest **patch**
   - No conventional prefixes -- keyword fallback: "Add"/"Implement"/"Create" = minor, "Fix" = patch, otherwise patch
4. **If `$ARGUMENTS` is `patch`, `minor`, or `major`:** use it directly, skip the suggestion prompt (the major gate still applies).
   **If `$ARGUMENTS` is `auto`:** report the suggestion with its reasoning and go on with it
   without waiting. A suggested major stops instead (see the major-bump gate).
5. **First-release check:** If no previous tags exist and `$ARGUMENTS` is empty, read the current version from `package.json`. Ask: "No previous releases found. Release current version as v{version}? [confirm/override]". If confirmed, skip the version bump in Step 2.
6. **Otherwise:** report the suggestion with reasoning and wait for confirmation:
   ```
   Suggested bump: minor
   Reason: 2 feat: commits found since v2.0.0
   Commits: feat: add tray monochrome variant, fix: ICO 24px entry tier

   Proceed with minor bump (2.0.0 -> 2.1.0)? [confirm/override]
   ```

## Pre-flight Checks

1. **Detect mode:** Run `git rev-parse --abbrev-ref HEAD`.
   - `main` -- **main mode**: the maintainer's main checkout.
   - Any other branch, with CWD containing `.kangentic/worktrees/` -- **worktree mode**: a task
     worktree. The local branch is the worktree's own slug-hex branch and is never renamed. The
     release lands on `main` by pushing `HEAD:main`, so `<branch>` in main mode means `main` and
     in worktree mode means `HEAD` wherever a push or tag target appears below.
   - `HEAD` (detached), or any other branch outside a worktree -- stop: "Release must run from
     main or from a task worktree."
2. **Verify clean tree:** Run `git status --porcelain`. Must be empty. If not, stop: "Working tree must be clean before releasing."
3. **Fetch latest:** Run `git fetch origin main`
4. **Verify HEAD is origin/main, or a fast-forward of it:**
   - Main mode: `git diff HEAD origin/main --stat` must be empty. If not, stop: "Local main is
     behind origin/main. Run `git pull` first."
   - Worktree mode: `git merge-base --is-ancestor origin/main HEAD` must succeed, so that
     `git push origin HEAD:main` is a fast-forward and never needs force. If it fails, the
     worktree is behind or diverged: stop and rebase it (`git rebase origin/main`) first.
     Then run `git log --oneline origin/main..HEAD`. Any commit listed will be PUSHED TO `main`
     with the release, with no pull request and no review (see 7 below), and it appears in the
     changelog. If the list is non-empty, show it and get the maintainer's confirmation before
     going on. That holds in `auto` mode too: it is a stop with no outcome line, never a question
     `auto` answers. An empty list is the normal case, after the task's PR has been merged and the
     worktree realigned by `/merge-pull-request`.
5. **Install dependencies:** Run `npm ci`. (A worktree has its own `node_modules`, so this is
   needed there too. If it fails with EBUSY, a running process has a file locked: report it and
   stop.)
6. **Know before you commit anything: this skill pushes DIRECTLY to a protected `main`.**
   Step 5 does `git push origin main` (worktree mode: `git push origin HEAD:main`) with no pull
   request, no review, and no status check. It
   lands only because the maintainer has admin push access to `main` and admin enforcement is
   off. See Step 5 for what happens if that ever changes.

Report the current version, the bump type, and the new version before proceeding.

## Step 1 -- Validate (the determinism gate)

The committed assets must be exactly what the harness generates - a release
must never ship hand-edited or stale renders.

1. Run `npm run gen`
2. Run `npm run gen:icons`
3. Run `npm run gen:sprites`
4. Run `npm run gen:og`
5. Run `npm run gen:activity`
6. Run `npm run gen:ui`
7. Run `npm run gen:pointer`
8. Run `npm run gen:priority`
9. Run `git status --porcelain -- assets/ resources/`. Must be empty. If
   anything changed, stop and report: either a generator changed without
   regenerating (commit the regenerated output first) or an asset was
   hand-edited (never allowed - fix the script instead).
10. Run `npm run check`. Must pass. Drift only proves the bytes match the
    generators; this proves they satisfy the brand invariants.

## Step 2 -- Version Bump

**Skip if this is a confirmed first release of the current version.**

Run: `npm version <patch|minor|major> --no-git-tag-version`

Read the new version from `package.json` to confirm.

## Step 3 -- Changelog

1. Read `CHANGELOG.md` (repo root; it has a `<!-- releases -->` marker).
2. Group the commits from Step 0: Breaking Changes / Features / Fixes /
   Other, stripping conventional prefixes, one bullet per commit with its
   short hash. Omit empty categories.
3. Use the **Edit tool** to insert after the marker:
   ```markdown
   ## [vX.Y.Z] - YYYY-MM-DD

   ### Features
   - Commit message here (abc1234)
   ```

## Step 4 -- Commit

1. Stage: `git add package.json package-lock.json CHANGELOG.md`
2. Write the commit message with the **Write tool** to `.kangentic/COMMIT_MSG.tmp`:
   ```
   chore(release): vX.Y.Z
   ```
3. Commit: `git commit -F .kangentic/COMMIT_MSG.tmp`

## Step 5 -- Tag and Push

1. `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
2. Main mode: `git push origin main`. Worktree mode: `git push origin HEAD:main`.
3. `git push origin vX.Y.Z`

**If either push fails**, report the error and stop. Do not force-push.

**Worktree mode, afterwards:** the main checkout is now behind. Fast-forward it, from the
project root (two directories above `.kangentic/worktrees/<slug>/`), with
`git -C <projectRoot> pull --ff-only`, using forward slashes in the path (backslashes are eaten
by the Bash tool). If that fails because the main checkout has diverged or has uncommitted work,
report it and leave it alone, exactly as `/merge-pull-request` Step 3 does. The worktree branch
already sits on the release commit, so it needs no realign.

**Steps 2 and 3 above are a direct push to a protected branch, and that is a dependency worth naming.**
`main` requires a pull request with an approving review and a green status check. This push
satisfies none of them; it succeeds because the maintainer has admin push access and admin
enforcement is off. `/merge-back` records the same dependency for itself, and this is the
same bypass.

If admin enforcement is ever turned on, this step starts failing, and it fails at the worst
moment: the bump is already committed and the tag already created locally. Recovery, should
that happen: nothing has been pushed, so do NOT force-push and do not delete the local tag
in a panic. Land the bump commit through the board (`/pull-request`, then
`/merge-pull-request`), then move the tag onto the merged commit and push the tag alone. The
lasting fix is to route the release bump through a PR rather than to re-open the bypass.

Pushing the `vX.Y.Z` tag (step 3) is what triggers the CI publish workflow
(`.github/workflows/publish.yml`). Watch it in Step 7.

## Step 6 -- GitHub Release

Run: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "<the changelog entry body>"`

(Write the notes to a temp file under `.kangentic/` and use `--notes-file` if
the body is more than a couple of lines.)

## Step 7 -- CI Publish (watch the run)

Publishing runs in CI, not on this machine. The tag push in Step 5 triggers
`.github/workflows/publish.yml`, which reruns the determinism gate then runs
`npm publish --provenance --access public` via npm OIDC Trusted Publishing
(no NPM_TOKEN). Nothing to publish locally - watch the run and report it.

1. Find the run: `gh run list --workflow=publish.yml --limit 1`
2. Watch it: `gh run watch <run-id>` (or open the run URL).
3. If the run fails, do NOT publish locally. The git tag and GitHub release
   already exist; fix the cause and re-trigger the publish alone with
   `gh workflow run publish.yml --ref vX.Y.Z` (the workflow's idempotency
   guard makes re-runs safe) - do NOT re-run the whole pipeline. Until a
   publish run for the tag concludes `success`, the run ends with no outcome
   line, so the card stays in Release.

## Step 8 -- Report

- Version, tag, commits included
- The changelog entry
- The CI publish run URL (from Step 7) and confirmation the new version shows
  a provenance badge on npm.
- Links: `https://github.com/Kangentic/branding/releases` and `https://www.npmjs.com/package/@kangentic/branding`
- Remind: consumers pick this up via `npm update @kangentic/branding` (or a submodule bump where used).
- **Do NOT list "consumer repos that should update now" from memory.** This
  instruction used to end that way, and it was unanswerable: nothing in this repo
  records which version any consumer is on, so the list could only ever be
  guessed, and 2.7.0's adoption tasks were filed speculatively because of it.
  Either resolve it or say it is unresolved:
  - To resolve it, read each consumer's own declared range and lockfile entry for
    `@kangentic/branding` (its `package.json` plus `package-lock.json`). That is
    the only authoritative answer, and it lives in the consumer, not here.
  - Otherwise state plainly that adoption is not tracked in this repo, and scope
    the reminder to what a release can honestly claim: the version is published
    and consumers upgrade on their own schedule.
- A consumer-version table in THIS repo was considered and declined 2026-07-30: it
  would be a hand-maintained record of other repos' internals with no gate able to
  check it, which is precisely the rot `brand-record-fidelity.md` exists to
  prevent. Read the consumers instead of mirroring them.
- **Worktree mode:** report whether the project root's `main` fast-forwarded (Step 5, "Worktree
  mode, afterwards"). In the Release column the line below moves the task to Done, which removes
  the worktree; outside it, remind the user to move the task to Done.
- The last line of the message, alone, only when Step 7's publish run for this tag concluded
  `success`: `Release: published`. Do not gate it on `npm view`. After CI had published v2.13.0,
  two checks, the first about 30 seconds later, still reported 2.12.0, and `npm view` returned a
  404 for 2.13.0 even with `--prefer-online`.

## Outcome line

The Release column's "Finish" automation (`kangentic.json`) is a Text match: each time a turn ends
here it reads the last line of your final message, ignoring case, punctuation and markdown, and
moves the task to Done, which removes the worktree, when that line reads `Release: published` or
`Release: nothing to publish`. So the lines are a contract, and this section and that row change
together. `npm run check`'s `BOARD` check fails when the row waits for a line this skill no longer
prints.

- `Release: published` comes only from Step 8, after Step 7's publish run concluded `success`.
- `Release: nothing to publish` comes only from Step 0, when no commit landed since the last tag.
- Every other stop is a hold and prints no outcome line, so the card stays in Release: a suggested
  major in `auto` mode, commits that pre-flight 4 would push straight to `main`, a dirty tree or a
  branch behind `origin/main`, determinism drift or a failing `npm run check`, a refused push, a
  failed publish run, and a hand run's bump question.

## Allowed Tools

Use `Read`, `Glob`, `Grep`, `Bash` (for `git`, `npm`, `npx`, `gh`), `Write`
(temp files), and `Edit` (CHANGELOG.md).

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE
command. Never use `&&`, `||`, `|`, or `;`. Use `git -C <path>` for git
commands in another directory -- never `cd <path> && git ...`.
