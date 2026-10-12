---
description: Regenerate and verify brand assets, version bump, changelog, tag, GitHub release, and tag-triggered CI npm publish for @kangentic/branding. This is the Release column skill (after Merge); it also runs by hand from the main checkout.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(gh:*)
argument-hint: [patch|minor|major]
---

# Release

Release pipeline for `@kangentic/branding`: verify the committed assets match
the harness, bump, changelog, tag, push, GitHub release. Pushing the tag
triggers `.github/workflows/publish.yml`, which reruns the determinism gate
in CI and publishes to npm with provenance via OIDC - no local `npm publish`,
no stored token. Consumers (kangentic.com, kangentic desktop, kangentic-mobile)
update by bumping this package - a release here is how icons change everywhere.

This is the **Release column** skill: the board sends `/release` to a task that entered Release
after the **Merge column** (`/merge-pull-request`) landed its PR, which is worktree mode below.
The column sends no argument, so Step 0 suggests a bump and waits for confirmation; that pause is
the human gate on every publish. A merged task that should not cut a version (a board or docs
chore) skips Release and moves straight from Merge to Done.

**Usage:** `/release [patch|minor|major]`

Runs from the main checkout (on `main`) or from a task worktree. From a worktree it pushes
`HEAD:main`; see the pre-flight checks and Step 5.

- `/release` -- auto-suggests bump type from commit history, asks for confirmation
- `/release patch` -- refinements within the current brand line (2.0.0 to 2.0.1)
- `/release minor` -- new assets/variants within the line (2.0.0 to 2.1.0)
- `/release major` -- A NEW BRAND GENERATION ONLY. See the major-bump gate below.

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

## Step 0 -- Determine Bump Type

1. **Find the previous tag:** Run `git describe --tags --abbrev=0`. Note whether this succeeds or fails (no tags = first release).
2. **Collect commits since last tag:** Run `git log <previousTag>..HEAD --oneline --no-decorate` (or `git log --oneline --no-decorate` if no previous tag).
3. **Analyze conventional commit prefixes to suggest a bump type:**
   - Any commit with `!` after the type or containing `BREAKING CHANGE` -- suggest **major** (and apply the major-bump gate)
   - Any `feat:` commit -- suggest **minor**
   - Only `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`, `ci:`, `build:` -- suggest **patch**
   - No conventional prefixes -- keyword fallback: "Add"/"Implement"/"Create" = minor, "Fix" = patch, otherwise patch
4. **If `$ARGUMENTS` is `patch`, `minor`, or `major`:** use it directly, skip the suggestion prompt (the major gate still applies).
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
     going on. An empty list is the normal case, after the task's PR has been merged and the
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
7. Run `git status --porcelain -- assets/ resources/`. Must be empty. If
   anything changed, stop and report: either a generator changed without
   regenerating (commit the regenerated output first) or an asset was
   hand-edited (never allowed - fix the script instead).
8. Run `npm run check`. Must pass. Drift only proves the bytes match the
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
   guard makes re-runs safe) - do NOT re-run the whole pipeline.

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
  mode, afterwards"), and remind the user to move the task to Done on the board, which removes
  the worktree.

## Allowed Tools

Use `Read`, `Glob`, `Grep`, `Bash` (for `git`, `npm`, `npx`, `gh`), `Write`
(temp files), and `Edit` (CHANGELOG.md).

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE
command. Never use `&&`, `||`, `|`, or `;`. Use `git -C <path>` for git
commands in another directory -- never `cd <path> && git ...`.
