---
description: Regenerate and verify brand assets, version bump, changelog, tag, GitHub release, and npm publish for @kangentic/branding
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(gh:*)
argument-hint: [patch|minor|major]
---

# Release

Release pipeline for `@kangentic/branding`: verify the committed assets match
the harness, bump, changelog, tag, push, GitHub release, npm publish.
Consumers (kangentic.com, kangentic desktop, kangentic-mobile) update by
bumping this package - a release here is how icons change everywhere.

**Usage:** `/release [patch|minor|major]`

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

1. **Verify branch:** Run `git rev-parse --abbrev-ref HEAD`. Must be `main`. If not, stop: "Release must run from the main branch."
2. **Verify clean tree:** Run `git status --porcelain`. Must be empty. If not, stop: "Working tree must be clean before releasing."
3. **Fetch latest:** Run `git fetch origin main`
4. **Verify up-to-date:** Run `git diff HEAD origin/main --stat`. Must be empty. If not, stop: "Local main is behind origin/main. Run `git pull` first."
5. **Install dependencies:** Run `npm ci`.

Report the current version, the bump type, and the new version before proceeding.

## Step 1 -- Validate (the determinism gate)

The committed assets must be exactly what the harness generates - a release
must never ship hand-edited or stale renders.

1. Run `npm run gen`
2. Run `npm run gen:icons`
3. Run `npm run gen:sprites`
4. Run `npm run gen:og`
5. Run `git status --porcelain -- assets/ resources/`. Must be empty. If
   anything changed, stop and report: either a generator changed without
   regenerating (commit the regenerated output first) or an asset was
   hand-edited (never allowed - fix the script instead).

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
2. `git push origin main`
3. `git push origin vX.Y.Z`

**If either push fails**, report the error and stop. Do not force-push.

## Step 6 -- GitHub Release

Run: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "<the changelog entry body>"`

(Write the notes to a temp file under `.kangentic/` and use `--notes-file` if
the body is more than a couple of lines.)

## Step 7 -- npm Publish

There is no publish workflow; publishing happens here, from the maintainer
machine.

1. Run `npm whoami`. If it fails, stop: "Run `npm login` first, then re-run /release - all git steps are already done, so resume from this step."
2. Run `npm publish --access public`
   (`--access public` is required on every publish of a scoped package's
   first version; harmless afterwards.)
3. If publish fails after the tag was pushed, report clearly that the git
   release exists but npm does not, and that re-running `npm publish` alone
   completes it - do NOT re-run the whole pipeline.

## Step 8 -- Report

- Version, tag, commits included
- The changelog entry
- Links: `https://github.com/Kangentic/branding/releases` and `https://www.npmjs.com/package/@kangentic/branding`
- Remind: consumers pick this up via `npm update @kangentic/branding` (or a submodule bump where used) - list any consumer repos that should update now.

## Allowed Tools

Use `Read`, `Glob`, `Grep`, `Bash` (for `git`, `npm`, `npx`, `gh`), `Write`
(temp files), and `Edit` (CHANGELOG.md).

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE
command. Never use `&&`, `||`, `|`, or `;`. Use `git -C <path>` for git
commands in another directory -- never `cd <path> && git ...`.
